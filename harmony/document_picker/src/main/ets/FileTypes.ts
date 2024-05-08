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

const extensions = Object.freeze({
  allFiles: '*',
  audio:
  '.3g2 .3gp .aac .adt .adts .aif .aifc .aiff .asf .au .m3u .m4a .m4b .mid .midi .mp2 .mp3 .mp4 .rmi .snd .wav .wax .wma',
  csv: '.csv',
  doc: '.doc',
  docx: '.docx',
  images: '.jpeg .jpg .png',
  pdf: '.pdf',
  plainText: '.txt',
  ppt: '.ppt',
  pptx: '.pptx',
  video: '.mp4',
  xls: '.xls',
  xlsx: '.xlsx',
  zip: '.zip .gz',
})
type extType = typeof extensions;
type extTypeKeys = keyof extType;

interface _PickerOptions {
  type: extType[extTypeKeys] | extType[extTypeKeys][]
  mode?: 'import' | 'open'
  copyTo?: 'cachesDirectory' | 'documentDirectory'
  allowMultiSelection: boolean
}

export type PickerOptions = Readonly<_PickerOptions>;
