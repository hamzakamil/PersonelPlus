/**
 * API Response Helper Utilities
 * Bu dosya API response'larından veri çıkarmak için yardımcı fonksiyonlar içerir.
 * Backend formatı: { success: true, data: [...], message: "...", pagination: {...} }
 */

/**
 * API response'dan data çıkarma
 * @param {Object} response - Axios response
 * @param {*} defaultValue - Varsayılan değer
 * @returns {*} Çıkarılan data veya varsayılan değer
 */
export const extractData = (response, defaultValue = null) => {
  return response.data?.data ?? response.data ?? defaultValue
}

/**
 * API response'dan array çıkarma
 * @param {Object} response - Axios response
 * @returns {Array} Çıkarılan array veya boş array
 */
export const extractArray = (response) => {
  const data = extractData(response, [])
  return Array.isArray(data) ? data : []
}

/**
 * API response'dan object çıkarma
 * @param {Object} response - Axios response
 * @returns {Object} Çıkarılan object veya boş object
 */
export const extractObject = (response) => {
  const data = extractData(response, {})
  return typeof data === 'object' && data !== null ? data : {}
}

/**
 * API response'dan pagination bilgisi çıkarma
 * @param {Object} response - Axios response
 * @returns {Object} Pagination bilgisi
 */
export const extractPagination = (response) => {
  return response.data?.meta || response.data?.pagination || null
}

/**
 * API response'dan mesaj çıkarma
 * @param {Object} response - Axios response
 * @returns {string} Mesaj
 */
export const extractMessage = (response) => {
  return response.data?.message || ''
}

export default {
  extractData,
  extractArray,
  extractObject,
  extractPagination,
  extractMessage
}
