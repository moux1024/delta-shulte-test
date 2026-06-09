/**
 * 最佳记录 & Session 数据上传
 * 使用微信云开发云函数
 * 如需使用自有服务器，修改 BASE_URL 即可
 */

const BASE_URL = '' // TODO: 替换为你的服务器地址，如 'https://api.yourserver.com'
const CLOUD_FUNCTION = 'submitRecord' // 云函数名称

/**
 * 上传训练记录到服务器
 * @param {Object} session EventCollector.getSession() 的数据
 * @param {Object} dimensions 评估维度数据
 * @returns {Promise}
 */
function uploadSession(session, dimensions) {
  // 优先尝试云开发
  if (wx.cloud) {
    return uploadViaCloud(session, dimensions)
  }
  // 回退到自有服务器
  if (BASE_URL) {
    return uploadViaHttp(session, dimensions)
  }
  return Promise.resolve(null)
}

/**
 * 上传最佳记录（排行榜用）
 * @param {Object} params { nickname, gridSize, totalTime, overallScore }
 * @returns {Promise}
 */
function uploadBestRecord(params) {
  if (wx.cloud) {
    return wx.cloud.callFunction({
      name: CLOUD_FUNCTION,
      data: {
        action: 'uploadBest',
        ...params
      }
    })
  }
  if (BASE_URL) {
    return wx.request({
      url: `${BASE_URL}/api/best-record`,
      method: 'POST',
      data: params
    })
  }
  return Promise.resolve(null)
}

/**
 * 获取排行榜
 * @param {number} gridSize 方格大小
 * @param {number} limit 数量
 * @returns {Promise}
 */
function getLeaderboard(gridSize, limit) {
  if (wx.cloud) {
    return wx.cloud.callFunction({
      name: CLOUD_FUNCTION,
      data: {
        action: 'leaderboard',
        gridSize,
        limit: limit || 20
      }
    }).then(res => res.result)
  }
  if (BASE_URL) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${BASE_URL}/api/leaderboard`,
        method: 'GET',
        data: { gridSize, limit: limit || 20 },
        success: res => resolve(res.data),
        fail: reject
      })
    })
  }
  return Promise.resolve([])
}

// 内部实现

function uploadViaCloud(session, dimensions) {
  return wx.cloud.callFunction({
    name: CLOUD_FUNCTION,
    data: {
      action: 'submitSession',
      session,
      dimensions,
      openId: '{openid}' // 云函数中自动获取
    }
  }).catch(err => {
    console.warn('云函数上传失败:', err)
    return null
  })
}

function uploadViaHttp(session, dimensions) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/api/session`,
      method: 'POST',
      data: { session, dimensions },
      success: res => resolve(res.data),
      fail: err => {
        console.warn('HTTP上传失败:', err)
        resolve(null)
      }
    })
  })
}

module.exports = {
  uploadSession,
  uploadBestRecord,
  getLeaderboard
}
