

/**
 * 对象生成url
 * @param baseUrl url
 * @param obj
 * @returns {string}
 */
export function setObj2Url(baseUrl: string, obj?: Record<string, any>): string {
  if (!obj) return baseUrl;

  let parameters = '';
  for (const key in obj) {
    parameters += '&' + key + '=' + encodeURIComponent(obj[key]);
  }

  const id = baseUrl.lastIndexOf('?');
  if (id < 0) return baseUrl + '?' + parameters.slice(1);

  return (
    baseUrl.slice(0, id) +
    '?' +
    baseUrl.slice(id + 1).replace(/\/$/, '') +
    parameters
  );
}

/**
 * url生成对象
 * @param {Object} local window.location对象
 * @returns {Record<string, string>} 解析后的查询参数对象
 */
export function getObjOfUrl(
  local?: Partial<{ search: string; hash: string }>,
): Record<string, string> {
  const { hash = '', search = '' } = local || window.location;

  let qs = search.split('?')[1] || '';
  const _hash = hash.split('?')[1] || '';
  if (_hash) qs += '&' + _hash;

  return (qs && Object.fromEntries(new URLSearchParams(qs))) || {};
}
