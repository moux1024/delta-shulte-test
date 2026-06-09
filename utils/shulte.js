/**
 * 舒尔特方格核心算法 & 多维度认知能力评估系统
 * 
 * 评估维度：
 * 1. 搜索速度 (Search Speed) - 权重 30%
 * 2. 注意力稳定性 (Attention Stability) - 权重 20%
 * 3. 持续专注力 (Focus Endurance) - 权重 20%
 * 4. 错误控制能力 (Error Control) - 权重 15%
 * 5. 恢复能力 (Recovery Ability) - 权重 15%
 */

/**
 * 生成随机舒尔特方格
 * @param {number} size 方格边长（5/6/7）
 */
function generateShulteGrid(size) {
  const total = size * size
  const numbers = Array.from({ length: total }, (_, i) => i + 1)

  // Fisher-Yates 洗牌
  for (let i = total - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]]
  }

  return numbers.map((num, idx) => ({
    id: idx,
    num,
    found: false,
    wrong: false
  }))
}

/**
 * 格式化时间
 */
function formatTime(timeMs) {
  const totalSeconds = timeMs / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  const ms = Math.floor((totalSeconds % 1) * 100)

  if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
  }
  return `${seconds}.${ms.toString().padStart(2, '0')}s`
}

// ========================
// 多维度认知能力评估
// ========================

/**
 * 从事件列表计算5个维度得分
 * @param {Array} events 点击事件数组
 * @param {number} gridSize 方格大小
 * @returns {Object} { searchSpeed, stability, focus, errorControl, recovery, overallScore, details }
 */
function evaluateDimensions(events, gridSize) {
  // 分离正确事件和错误事件
  const correctEvents = events.filter(e => e.isCorrect)
  const wrongEvents = events.filter(e => !e.isCorrect)

  if (correctEvents.length < 2) {
    return getFallbackScores()
  }

  // 提取正确事件的反应时间（ms）
  const reactionTimes = correctEvents.map(e => e.reactionTime)

  // 1. 搜索速度
  const searchSpeed = calcSearchSpeed(reactionTimes)

  // 2. 注意力稳定性
  const stability = calcStability(reactionTimes)

  // 3. 持续专注力
  const focus = calcFocus(reactionTimes)

  // 4. 错误控制能力
  const errorControl = calcErrorControl(events, correctEvents, wrongEvents)

  // 5. 恢复能力
  const recovery = calcRecovery(events, wrongEvents)

  // 综合评分
  const overallScore = Math.round(
    searchSpeed * 0.30 +
    stability * 0.20 +
    focus * 0.20 +
    errorControl * 0.15 +
    recovery * 0.15
  )

  return {
    searchSpeed,
    stability,
    focus,
    errorControl,
    recovery,
    overallScore,
    // 详细数据（用于展示）
    details: {
      avgRT: avg(reactionTimes),
      medianRT: median(reactionTimes),
      stdRT: std(reactionTimes),
      errorRate: wrongEvents.length / events.length,
      firstHalfAvg: avg(reactionTimes.slice(0, Math.ceil(reactionTimes.length / 2))),
      secondHalfAvg: avg(reactionTimes.slice(Math.floor(reactionTimes.length / 2)))
    }
  }
}

/**
 * 维度1：搜索速度
 * 基于平均反应时间，标准化到0-100
 */
function calcSearchSpeed(reactionTimes) {
  const avgRT = avg(reactionTimes)

  // 标准化公式：使用非线性映射
  // 400ms → 95分, 800ms → 70分, 1500ms → 40分, 3000ms → 10分
  const score = 100 - 95 * (1 - Math.exp(-avgRT / 1200))

  return clamp(Math.round(score), 0, 100)
}

/**
 * 维度2：注意力稳定性
 * 基于反应时间标准差，标准差越小越稳定
 */
function calcStability(reactionTimes) {
  const stdRT = std(reactionTimes)
  const avgRT = avg(reactionTimes)
  const cv = stdRT / avgRT // 变异系数

  // 变异系数越小越稳定
  // CV < 0.15 → 95+, CV 0.15-0.25 → 80-95, CV 0.25-0.40 → 60-80, CV 0.40-0.60 → 40-60, CV > 0.6 → <40
  const score = 100 - 120 * cv

  return clamp(Math.round(score), 0, 100)
}

/**
 * 维度3：持续专注力
 * 基于疲劳系数：后半程平均RT / 前半程平均RT
 */
function calcFocus(reactionTimes) {
  const mid = Math.floor(reactionTimes.length / 2)
  const firstHalf = reactionTimes.slice(0, mid || 1)
  const secondHalf = reactionTimes.slice(mid)

  if (firstHalf.length === 0 || secondHalf.length === 0) return 70

  const firstAvg = avg(firstHalf)
  const secondAvg = avg(secondHalf)
  const fatigueRatio = secondAvg / firstAvg

  // fatigueRatio = 1.0 → 满分, > 1.0 衰减
  // 1.0 → 95, 1.2 → 80, 1.5 → 60, 2.0 → 35, 3.0 → 10
  const score = 100 * Math.exp(-(fatigueRatio - 1) * 1.8)

  return clamp(Math.round(score), 0, 100)
}

/**
 * 维度4：错误控制能力
 * 综合：70% 错误率 + 30% 冲动指数
 */
function calcErrorControl(events, correctEvents, wrongEvents) {
  const totalClicks = events.length
  if (totalClicks === 0) return 100

  // 错误率得分（错误越少分越高）
  const errorRate = wrongEvents.length / totalClicks
  const errorRateScore = Math.max(0, 100 - errorRate * 200) // 每次错误扣约2分权重

  // 冲动指数：错误发生前反应时间 < 300ms 的比例
  const impulsiveErrors = wrongEvents.filter(e => e.reactionTime < 300).length
  const impulsiveRatio = wrongEvents.length > 0 ? impulsiveErrors / wrongEvents.length : 0
  const impulsiveScore = Math.max(0, 100 - impulsiveRatio * 150)

  const score = errorRateScore * 0.70 + impulsiveScore * 0.30

  return clamp(Math.round(score), 0, 100)
}

/**
 * 维度5：恢复能力
 * 错误发生后到下一次正确点击的时间
 */
function calcRecovery(events, wrongEvents) {
  if (wrongEvents.length === 0) {
    // 没有错误 → 给予较高分（体现稳定性）
    return 95
  }

  // 收集每次错误后的恢复时间
  const recoveryTimes = []
  const eventTimes = events.map(e => e.timestamp)

  wrongEvents.forEach(wrong => {
    const wrongTime = wrong.timestamp
    // 找到下一个正确事件
    const nextCorrect = events.find(e => e.timestamp > wrongTime && e.isCorrect)
    if (nextCorrect) {
      recoveryTimes.push(nextCorrect.timestamp - wrongTime)
    }
  })

  if (recoveryTimes.length === 0) return 50

  const avgRecovery = avg(recoveryTimes)

  // 恢复越快分越高
  // 500ms → 98, 1000ms → 85, 2000ms → 60, 3000ms → 40, 5000ms → 15
  const score = 100 * Math.exp(-avgRecovery / 2000)

  return clamp(Math.round(score), 0, 100)
}

/**
 * 生成能力等级
 */
function getGrade(score) {
  if (score >= 90) return { grade: '卓越', color: '#ff6b35', level: 'S+' }
  if (score >= 80) return { grade: '优秀', color: '#ff8c5a', level: 'S' }
  if (score >= 70) return { grade: '良好', color: '#2ecc71', level: 'A' }
  if (score >= 60) return { grade: '普通', color: '#f39c12', level: 'B' }
  if (score >= 40) return { grade: '待提升', color: '#e67e22', level: 'C' }
  return { grade: '需重点训练', color: '#e74c3c', level: 'D' }
}

/**
 * 根据综合评分生成三角洲老登风格评价
 */
function getDeltaComment(overallScore, dimensions) {
  const { searchSpeed, stability, focus, errorControl, recovery } = dimensions

  // 找优势项和待提升项
  const allDims = [
    { key: 'searchSpeed', name: '搜索速度', score: searchSpeed },
    { key: 'stability', name: '注意力稳定性', score: stability },
    { key: 'focus', name: '持续专注力', score: focus },
    { key: 'errorControl', name: '错误控制', score: errorControl },
    { key: 'recovery', name: '恢复能力', score: recovery }
  ].sort((a, b) => b.score - a.score)

  const strengths = allDims.filter(d => d.score >= 70).slice(0, 2)
  const weaknesses = allDims.filter(d => d.score < 60).slice(0, 2)

  let comment = ''

  if (overallScore >= 90) {
    comment = '三角洲在你面前就是个笑话！你就是那个最硬核的对手，建议直接打职业。'
  } else if (overallScore >= 80) {
    comment = '你的反应速度堪称一流，在三角洲里绝对能carry全场。队友有你是福气。'
  } else if (overallScore >= 70) {
    comment = '玩三角洲应该很顺手，注意走位和团队配合，你就是那个MVP候选人。'
  } else if (overallScore >= 60) {
    comment = '反应速度中规中矩，玩三角洲没问题但别当孤狼。建议多练练枪法和地图意识。'
  } else if (overallScore >= 40) {
    comment = '说实话老登，你在三角洲里大概率是送人头的。多练练吧，或者去玩欢乐局。'
  } else {
    comment = '完了老登，三角洲里你可能连敌人在哪都看不清就倒了。建议先从打地鼠开始练起 😂'
  }

  return { comment, strengths, weaknesses }
}

/**
 * 生成三角洲适配建议
 */
function getDeltaAdvice(overallScore) {
  if (overallScore >= 90) {
    return [
      { icon: '🏆', text: '你就是为三角洲而生的，直接开排位' },
      { icon: '🎯', text: '建议主玩狙击手，一枪一个' },
      { icon: '🔥', text: '带带老登朋友们，当个队长吧' }
    ]
  }
  if (overallScore >= 80) {
    return [
      { icon: '✅', text: '完全适合玩三角洲，放心入坑' },
      { icon: '🎯', text: '步枪手是你的最佳位置' },
      { icon: '📋', text: '建议多练习地图路线，发挥空间巨大' }
    ]
  }
  if (overallScore >= 70) {
    return [
      { icon: '⚠️', text: '可以玩三角洲，但建议先多练练' },
      { icon: '🎯', text: '适合玩辅助位或载具手' },
      { icon: '📋', text: '每天做3组舒尔特方格训练，一个月见效' }
    ]
  }
  if (overallScore >= 60) {
    return [
      { icon: '🤔', text: '玩三角洲会有些吃力，但不是不行' },
      { icon: '🎯', text: '建议从小地图模式开始，循序渐进' },
      { icon: '📋', text: '重点训练视觉搜索能力，多做标准难度练习' }
    ]
  }
  return [
    { icon: '😅', text: '老登，三角洲可能对你不太友好' },
    { icon: '🎯', text: '建议从休闲模式开始，降低挫败感' },
    { icon: '📋', text: '每天坚持舒尔特方格训练，3个月会有明显提升' },
    { icon: '💡', text: '或者试试欢乐局，开心最重要' }
  ]
}

// ========================
// 辅助统计函数
// ========================

function avg(arr) {
  if (arr.length === 0) return 0
  return arr.reduce((sum, v) => sum + v, 0) / arr.length
}

function median(arr) {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function std(arr) {
  if (arr.length < 2) return 0
  const m = avg(arr)
  const variance = arr.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / arr.length
  return Math.sqrt(variance)
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

function getFallbackScores() {
  return {
    searchSpeed: 50,
    stability: 50,
    focus: 50,
    errorControl: 50,
    recovery: 50,
    overallScore: 50,
    details: {}
  }
}

module.exports = {
  generateShulteGrid,
  formatTime,
  evaluateDimensions,
  getGrade,
  getDeltaComment,
  getDeltaAdvice,
  avg,
  median,
  std
}
