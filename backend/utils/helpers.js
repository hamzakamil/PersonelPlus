/**
 * Backend Helper Utilities
 * Bu dosya backend'de sık kullanılan yardımcı fonksiyonları içerir.
 */

/**
 * Populated object veya ObjectId'den ID çıkarma
 * Mongoose populate edilmiş objelerden güvenli ID çıkarır
 * @param {Object|String} obj - Populated object veya ObjectId string
 * @returns {String|null} ID string veya null
 */
const extractId = (obj) => {
  if (!obj) return null
  return obj?._id?.toString() || obj?.toString()
}

/**
 * İki ID'nin eşit olup olmadığını kontrol et
 * Populated object veya ObjectId karşılaştırması yapar
 * @param {Object|String} id1 - İlk ID
 * @param {Object|String} id2 - İkinci ID
 * @returns {Boolean} Eşit mi?
 */
const isSameId = (id1, id2) => {
  const extracted1 = extractId(id1)
  const extracted2 = extractId(id2)
  if (!extracted1 || !extracted2) return false
  return extracted1 === extracted2
}

/**
 * Kullanıcının dealer ID'sini al
 * @param {Object} user - req.user objesi
 * @returns {String|null} Dealer ID
 */
const getUserDealerId = (user) => {
  return extractId(user?.dealer)
}

/**
 * Kullanıcının company ID'sini al
 * @param {Object} user - req.user objesi
 * @returns {String|null} Company ID
 */
const getUserCompanyId = (user) => {
  return extractId(user?.company)
}

/**
 * Kullanıcının rol adını al
 * @param {Object} user - req.user objesi
 * @returns {String|null} Rol adı
 */
const getUserRoleName = (user) => {
  return user?.role?.name || user?.role || null
}

module.exports = {
  extractId,
  isSameId,
  getUserDealerId,
  getUserCompanyId,
  getUserRoleName
}
