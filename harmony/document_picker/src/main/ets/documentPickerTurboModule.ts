/**
 * MIT License
 *
 * Copyright (C) 2024 Huawei Device Co., Ltd.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { TM } from '@rnoh/react-native-openharmony/generated/ts';
import { TurboModule } from '@rnoh/react-native-openharmony/ts';
import { PickerOptions } from './FileTypes';
import picker from '@ohos.file.picker';
import fileuri from '@ohos.file.fileuri';
import fs, { ReadOptions } from '@ohos.file.fs';
import logger from './Logger';
import { BusinessError } from '@kit.BasicServicesKit';
import util from '@ohos.util';
import mime from "mime";


export class DocumentPickerTurboModule extends TurboModule implements TM.RNDocumentPicker.Spec {

  private documentPicker: picker.DocumentViewPicker = new picker.DocumentViewPicker();

  getConstants(): Object {
    return {};
  }

  /*
   * 获取要选择文件的后缀
   *
   * @param types 文件后缀列表 eg: [ '.jpeg .jpg .png', '.txt', '.zip .gz' ]
   * @return 文件后缀列表 [ '.jpeg', '.jpg', '.png', '.txt', '.zip', '.gz' ]
   */
  private getPickerFileSuffix(types: PickerOptions['type']): string[] {
    let suffixList: string[] = [];
    if (Array.isArray(types)) {
      for (const suffix of types) {
        suffixList.push(...suffix.split(' '));
      }
    }
    return suffixList;
  }

  /*
   * 获取文件大小
   *
   * @param uri 文件路径
   * @return 返回文件大小（byte）
   */
  private async getFileSize(uri: string): Promise<number> {
    const stat = await fs.stat(uri);
    return stat.size;
  }

  /*
   * 流式读写 使用系统fs.copyFile会报错
   *
   * @param source 原文件沙箱路径
   * @param dest 目标沙箱路径
   */
  private async copyFile(source: string, dest: string): Promise<void> {
    // 打开文件流
    let inputStream = fs.createStreamSync(source, 'r+');
    let outputStream = fs.createStreamSync(dest, "w+");
    // 以流的形式读取源文件内容并写入目的文件
    let bufSize = 4096;
    let readSize = 0;
    let buf = new ArrayBuffer(bufSize);
    let readOptions: ReadOptions = {
      offset: readSize,
      length: bufSize
    };
    let readLen = await inputStream.read(buf, readOptions);
    readSize += readLen;
    while (readLen > 0) {
      await outputStream.write(buf);
      readOptions.offset = readSize;
      readLen = await inputStream.read(buf, readOptions);
      readSize += readLen;
    }
    // 关闭文件流
    inputStream.closeSync();
    outputStream.closeSync();
  }

  /*
   * 有传入的copyTo选项，每次会新建UUID目录且文件拷贝到该目录下, dir参数指定是在哪个目录下。
   *
   * @param sourceUri 源文件uri
   * @param dir 目标文件夹
   */
  private async copyFileToLocalStorage(sourceUri: fileuri.FileUri, dir: PickerOptions['copyTo']): Promise<string> {
    const dirPath = dir === 'cachesDirectory' ?
      this.ctx.uiAbilityContext.cacheDir :
      this.ctx.uiAbilityContext.filesDir;
    const destUUIdDir =  dirPath + '/' + util.generateRandomUUID();
    const destFilePath = `${destUUIdDir}/${sourceUri.name ?? new Date().getTime()}`;
    await fs.mkdir(destUUIdDir, true);
    await this.copyFile(sourceUri.path, destFilePath);
    return destFilePath;
  }

  /*
   * 根据picker拿到的uri获取文件更多信息：文件大小、文件名、 mimetype等
   */
  private async parseFileByFileUri(uri: string,
    copyToDir?: PickerOptions['copyTo']): Promise<TM.RNDocumentPicker.DocumentPickerResponse> {
    const fUri: fileuri.FileUri = new fileuri.FileUri(uri);
    const fileSize = await this.getFileSize(fUri.path);
    const filename = fUri.name;
    const fileExt = filename.substring(filename.lastIndexOf('.'));
    const fileMimeType = mime.getType(fileExt);
    let result: TM.RNDocumentPicker.DocumentPickerResponse;
    result = {
      uri: fUri.path,
      type: fileMimeType,
      name: filename,
      size: fileSize,
      fileCopyUri: null,
    };
    try {
      if (copyToDir) {
        result.fileCopyUri = await this.copyFileToLocalStorage(fUri, copyToDir);
      };
    } catch (err) {
      let e: BusinessError = err;
      result.copyError = `${e.code} ${e.message}`;
    }
    return result;
  }

  /*
   * 根据传入的选择参数调用 documentPicker
   */
  async pick(options: PickerOptions): Promise<TM.RNDocumentPicker.DocumentPickerResponse[]> {
    this.ctx.rnInstance.subscribeToLifecycleEvents
    try {
      const pickerOpt = new picker.DocumentSelectOptions();
      if (canIUse('SystemCapability.FileManagement.UserFileService.FolderSelection')) {
        pickerOpt.selectMode = picker.DocumentSelectMode.FILE;
        pickerOpt.fileSuffixFilters = this.getPickerFileSuffix(options.type);
      };
      // 单选
      if (!options.allowMultiSelection) {
        pickerOpt.maxSelectNumber = 1;
      };
      const pickerRes = await this.documentPicker.select(pickerOpt);
      const parseRes = await Promise.allSettled(
        pickerRes.map(uri => this.parseFileByFileUri(uri, options.copyTo))
      );
      return parseRes.map(v => v.status === 'fulfilled' && v.value);
    } catch (err) {
      let e: BusinessError = err;
      logger.info(`${e.code} ${e.message}`);
    }
  }

  async releaseSecureAccess(_uris: string[]): Promise<void> {
    return
  }

  async pickDirectory(): Promise<TM.RNDocumentPicker.DirectoryPickerResponse> {
    const pickerOpt = new picker.DocumentSelectOptions();
    if (canIUse('SystemCapability.FileManagement.UserFileService.FolderSelection')) {
      pickerOpt.selectMode = picker.DocumentSelectMode.FOLDER;
    };
    const pickerRes = await this.documentPicker.select(pickerOpt);
    return { uri: pickerRes[0] }
  }

  public __onDestroy__(): void {
    logger.info('RNDocumentPick destroy!');
  }

}