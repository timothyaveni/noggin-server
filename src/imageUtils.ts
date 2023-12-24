import axios from 'axios';

export const imageUrlToBase64 = async (url: string) => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
  });

  // todo: are there weird injection issues here
  return `data:${response.headers['content-type']};base64,${Buffer.from(
    response.data,
    'binary',
  ).toString('base64')}`;
};

export const emptyPNGUrl = () => {
  // convert -size 1x1 xc:black png:- | base64 -w 0
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABAQAAAAA3bvkkAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAAmJLR0QAAd2KE6QAAAAHdElNRQfnDBgADgOQQm/fAAAACklEQVQI12NgAAAAAgAB4iG8MwAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyMy0xMi0yNFQwMDoxNDowMyswMDowMN23T2IAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjMtMTItMjRUMDA6MTQ6MDMrMDA6MDCs6vfeAAAAAElFTkSuQmCC';
};
