/**
 * 舒尔特方格核心算法 & 多维度认知能力评估系统
 * 
 * 评估维度：
 * 1. 搜索速度 (Search Speed) - 权重 30%
 * 2. 注意力稳定性 (Attention Stability) - 权重 20%
 * 3. 持续专注力 (Focus Endurance) - 权重 20%
 * 4. 错误控制能力 (Error Control) - 权重 15%
 * 5. 空间记忆能力 (Spatial Memory) - 权重 15%
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
 * @returns {Object} { searchSpeed, stability, focus, errorControl, spatialMemory, overallScore, details }
 */
function evaluateDimensions(events, gridSize) {
  // 分离正确事件和错误事件
  const correctEvents = events.filter(e => e.isCorrect)
  const wrongEvents = events.filter(e => !e.isCorrect)

  if (correctEvents.length < 2) {
    return getFallbackScores()
  }

  // 提取有效正确点击间隔。首个正确点击用于启动计时，reactionTime 通常为 0，应排除。
  const reactionTimes = correctEvents
    .slice(1)
    .map(e => e.reactionTime)
    .filter(t => t > 0)

  if (reactionTimes.length < 2) {
    return getFallbackScores()
  }

  // 1. 搜索速度
  const searchSpeed = calcSearchSpeed(reactionTimes, gridSize)

  // 2. 注意力稳定性
  const stability = calcStability(reactionTimes)

  // 3. 持续专注力
  const focus = calcFocus(getFocusReactionTimes(events, reactionTimes))

  // 4. 错误控制能力
  const errorControl = calcErrorControl(events, correctEvents, wrongEvents)

  // 5. 空间记忆能力
  const spatialMemory = calcSpatialMemory(events, reactionTimes, gridSize)

  // 综合评分
  const overallScore = Math.round(
    searchSpeed * 0.30 +
    stability * 0.20 +
    focus * 0.20 +
    errorControl * 0.15 +
    spatialMemory * 0.15
  )

  return {
    searchSpeed,
    stability,
    focus,
    errorControl,
    spatialMemory,
    overallScore,
    // 详细数据（用于展示）
    details: {
      avgRT: avg(reactionTimes),
      medianRT: median(reactionTimes),
      stdRT: std(reactionTimes),
      detrendedStdRT: detrendedStd(reactionTimes),
      errorRate: wrongEvents.length / events.length,
      maxWrongStreak: getMaxWrongStreak(events),
      firstHalfAvg: avg(reactionTimes.slice(0, Math.ceil(reactionTimes.length / 2))),
      secondHalfAvg: avg(reactionTimes.slice(Math.floor(reactionTimes.length / 2))),
      spatialMemoryTrend: getSpatialMemoryTrend(events, gridSize),
      focusSegments: getFocusSegments(getFocusReactionTimes(events, reactionTimes))
    }
  }
}

/**
 * 维度1：搜索速度
 * 基于平均反应时间，标准化到0-100
 */
function calcSearchSpeed(reactionTimes, gridSize) {
  const typicalRT = median(reactionTimes) * 0.70 + trimmedAvg(reactionTimes, 0.10) * 0.30
  const difficultyFactor = getGridDifficultyFactor(gridSize)
  const normalizedRT = typicalRT / difficultyFactor

  // 400ms → 95分, 800ms → 70分, 1500ms → 40分, 3000ms → 10分
  return scoreByBreakpoints(normalizedRT, [
    [0, 100],
    [400, 95],
    [800, 70],
    [1500, 40],
    [3000, 10],
    [5000, 0]
  ])
}

function getGridDifficultyFactor(gridSize) {
  if (gridSize >= 7) return 1.30
  if (gridSize >= 6) return 1.15
  return 1
}

/**
 * 维度2：注意力稳定性
 * 基于反应时间标准差，标准差越小越稳定
 */
function calcStability(reactionTimes) {
  const stdRT = detrendedStd(reactionTimes)
  const avgRT = avg(reactionTimes)
  const cv = stdRT / avgRT // 变异系数

  // 去趋势后的变异系数越小越稳定；持续变慢交给持续专注力评分。
  // CV < 0.15 → 95+, CV 0.15-0.25 → 80-95, CV 0.25-0.40 → 60-80, CV 0.40-0.60 → 40-60, CV > 0.6 → <40
  const score = 100 - 120 * cv

  return clamp(Math.round(score), 0, 100)
}

/**
 * 维度3：持续专注力
 * 基于三段疲劳系数：后段相对前段/中段是否变慢
 */
function calcFocus(reactionTimes) {
  const segments = getFocusSegments(reactionTimes)
  const { firstAvg, middleAvg, lastAvg } = segments

  if (!firstAvg || !middleAvg || !lastAvg) return 70

  const earlyToLateRatio = lastAvg / firstAvg
  const midToLateRatio = lastAvg / middleAvg
  const fatigueRatio = Math.max(earlyToLateRatio, midToLateRatio)

  // fatigueRatio 接近 1 表示末段没有明显掉速；允许 5% 正常波动。
  // 1.0 → 95, 1.2 → 83, 1.5 → 59, 2.0 → 19
  const score = fatigueRatio <= 1.05
    ? 95
    : 95 - (fatigueRatio - 1.05) * 80

  return clamp(Math.round(score), 0, 100)
}

function getFocusSegments(reactionTimes) {
  if (reactionTimes.length < 3) {
    return {
      firstAvg: avg(reactionTimes),
      middleAvg: avg(reactionTimes),
      lastAvg: avg(reactionTimes)
    }
  }

  const size = Math.floor(reactionTimes.length / 3)
  const first = reactionTimes.slice(0, size)
  const middle = reactionTimes.slice(size, reactionTimes.length - size)
  const last = reactionTimes.slice(reactionTimes.length - size)

  return {
    firstAvg: avg(first),
    middleAvg: avg(middle),
    lastAvg: avg(last)
  }
}

function getFocusReactionTimes(events, fallbackReactionTimes) {
  const cleanTimes = []

  for (let i = 1; i < events.length; i++) {
    const event = events[i]
    const prev = events[i - 1]
    if (event.isCorrect && prev.isCorrect && event.reactionTime > 0) {
      cleanTimes.push(event.reactionTime)
    }
  }

  // 错误较多时 cleanTimes 可能过少；此时退回到已排除首击的正确点击间隔。
  return cleanTimes.length >= 4 ? cleanTimes : fallbackReactionTimes
}

/**
 * 维度4：错误控制能力
 * 综合：60% 错误率 + 25% 冲动指数 + 15% 连续错误控制
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

  // 连续错误：同一个目标在被正确点击前连续点错，说明目标识别已经失控。
  const maxWrongStreak = getMaxWrongStreak(events)
  const streakScore = maxWrongStreak <= 1
    ? 100
    : Math.max(0, 100 - (maxWrongStreak - 1) * 35)

  const score = errorRateScore * 0.60 + impulsiveScore * 0.25 + streakScore * 0.15

  return clamp(Math.round(score), 0, 100)
}

function getMaxWrongStreak(events) {
  let current = 0
  let maxStreak = 0

  events.forEach(event => {
    if (event.isCorrect) {
      current = 0
      return
    }
    current += 1
    maxStreak = Math.max(maxStreak, current)
  })

  return maxStreak
}

/**
 * 维度5：空间记忆能力
 * 如果玩家逐步记住数字位置，剩余数字越少时，正确点击间隔应更短。
 */
function calcSpatialMemory(events, reactionTimes, gridSize) {
  const samples = getSpatialMemorySamples(events, gridSize)
  if (samples.length < 4) return 70

  const segmentSize = Math.max(1, Math.floor(samples.length / 3))
  const earlySamples = samples.slice(0, segmentSize)
  const lateSamples = samples.slice(samples.length - segmentSize)
  const earlyAvg = trimmedAvg(earlySamples.map(sample => sample.reactionTime), 0.10)
  const lateAvg = trimmedAvg(lateSamples.map(sample => sample.reactionTime), 0.10)

  if (!earlyAvg || !lateAvg) return 70

  const trendScore = scoreSpatialMemoryTrend(earlyAvg, lateAvg)
  const weightedScore = scoreSpatialMemoryByRemainingRatio(samples, earlyAvg)

  return clamp(Math.round(trendScore * 0.55 + weightedScore * 0.45), 0, 100)
}

function getSpatialMemorySamples(events, gridSize) {
  const totalNumbers = gridSize * gridSize
  return events
    .filter(event => event.isCorrect && event.reactionTime > 0)
    .map(event => {
      const remainingCount = Math.max(1, totalNumbers - event.targetNumber + 1)
      return {
        reactionTime: event.reactionTime,
        remainingRatio: remainingCount / totalNumbers
      }
    })
}

function scoreSpatialMemoryTrend(earlyAvg, lateAvg) {
  const lateToEarlyRatio = lateAvg / earlyAvg

  return scoreByBreakpoints(lateToEarlyRatio, [
    [0.55, 100],
    [0.70, 95],
    [0.85, 85],
    [1.00, 70],
    [1.20, 45],
    [1.50, 20],
    [2.00, 0]
  ])
}

function scoreSpatialMemoryByRemainingRatio(samples, baselineRT) {
  let totalWeight = 0
  let weightedScore = 0

  samples.forEach(sample => {
    const memoryProgress = 1 - sample.remainingRatio
    const weight = 1 + memoryProgress * 0.75
    const expectedRT = baselineRT * (1 - memoryProgress * 0.30)
    const rtRatio = sample.reactionTime / expectedRT
    const score = scoreByBreakpoints(rtRatio, [
      [0.70, 100],
      [0.85, 90],
      [1.00, 75],
      [1.20, 55],
      [1.50, 25],
      [2.00, 0]
    ])

    weightedScore += score * weight
    totalWeight += weight
  })

  return totalWeight ? weightedScore / totalWeight : 70
}

function getSpatialMemoryTrend(events, gridSize) {
  const samples = getSpatialMemorySamples(events, gridSize)
  if (samples.length < 4) return null

  const segmentSize = Math.max(1, Math.floor(samples.length / 3))
  const earlyAvg = avg(samples.slice(0, segmentSize).map(sample => sample.reactionTime))
  const lateAvg = avg(samples.slice(samples.length - segmentSize).map(sample => sample.reactionTime))

  return {
    earlyAvg,
    lateAvg,
    lateToEarlyRatio: earlyAvg ? lateAvg / earlyAvg : 0
  }
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
  const { searchSpeed, stability, focus, errorControl, spatialMemory } = dimensions

  // 找优势项和待提升项
  const allDims = [
    { key: 'searchSpeed', name: '搜索速度', score: searchSpeed },
    { key: 'stability', name: '注意力稳定性', score: stability },
    { key: 'focus', name: '持续专注力', score: focus },
    { key: 'errorControl', name: '错误控制', score: errorControl },
    { key: 'spatialMemory', name: '空间记忆', score: spatialMemory }
  ].sort((a, b) => b.score - a.score)

  const strengths = allDims.filter(d => d.score >= 70).slice(0, 2)
  const weaknesses = allDims.filter(d => d.score < 60).slice(0, 2)

  let comment = ''

  if (overallScore >= 90) {
    comment = '落地二员不封烟，抽完林树抽昊天！你就是那个最硬核的玩家，建议原地转职主播。'
  } else if (overallScore >= 80) {
    comment = '你的反应速度堪称一流，在三角洲里绝对能carry全场。队友有你是福气。'
  } else if (overallScore >= 70) {
    comment = '玩三角洲应该很顺手，注意走位和团队配合，你就是那个MVP候选人。'
  } else if (overallScore >= 60) {
    comment = '反应速度中规中矩，玩三角洲没问题但别当孤狼。建议多练练枪法和地图意识。'
  } else if (overallScore >= 40) {
    comment = '说实话老登，你在三角洲里大概率是送人头的。多练练吧，或者去玩大战场。'
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
      { icon: '', text: '玻璃大炮，千万撤离' },
      { icon: '', text: '绝航单三，天才少年!' },
      { icon: '', text: '大坝安澜，飞散吧小粑儿!' }
    ]
  }
  if (overallScore >= 80) {
    return [
      { icon: '', text: '魔王护? 没错就是我' },
      { icon: '', text: '突击是你的最佳位置，为队友撕开对面的防线' },
      { icon: '', text: '带上你的信息位队友，你们可以横扫核心区' }
    ]
  }
  if (overallScore >= 70) {
    return [
      { icon: '', text: '起全装吧，也可以一穿三' },
      { icon: '', text: '试试辅助位或工程位，这不只是一个枪法身法的游戏' },
      { icon: '', text: '' }
    ]
  }
  if (overallScore >= 60) {
    return [
      { icon: '', text: '护航是不行了，娱乐陪可以' },
      { icon: '', text: '猛攻不是唯一答案，试试三比特?' },
      { icon: '', text: '航天当水鬼的来，时间会证明电锯' }
    ]
  }
  return [
    { icon: '', text: '重在参与，不行咱开个变声器' },
    { icon: '', text: '跑刀! 跑刀! 跑刀!' },
    { icon: '', text: '航天桥上打扑克也挺好的，就是得带张全家福' },
    { icon: '', text: '赛季初去夜坝，把把都有红，就是屁股疼' }
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

function trimmedAvg(arr, trimRatio) {
  if (arr.length === 0) return 0
  if (arr.length < 5) return avg(arr)

  const sorted = [...arr].sort((a, b) => a - b)
  const trimCount = Math.floor(sorted.length * trimRatio)
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount)
  return avg(trimmed.length > 0 ? trimmed : sorted)
}

function std(arr) {
  if (arr.length < 2) return 0
  const m = avg(arr)
  const variance = arr.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / arr.length
  return Math.sqrt(variance)
}

function detrendedStd(arr) {
  if (arr.length < 3) return std(arr)

  const n = arr.length
  const xs = arr.map((_, index) => index)
  const meanX = avg(xs)
  const meanY = avg(arr)
  const varianceX = xs.reduce((sum, x) => sum + Math.pow(x - meanX, 2), 0)

  if (varianceX === 0) return std(arr)

  const covariance = xs.reduce((sum, x, index) => {
    return sum + (x - meanX) * (arr[index] - meanY)
  }, 0)
  const slope = covariance / varianceX
  const intercept = meanY - slope * meanX
  const residuals = arr.map((value, index) => value - (intercept + slope * index))

  return std(residuals)
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

function scoreByBreakpoints(value, points) {
  if (value <= points[0][0]) return points[0][1]

  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1]
    const [x2, y2] = points[i]
    if (value <= x2) {
      const ratio = (value - x1) / (x2 - x1)
      return clamp(Math.round(y1 + (y2 - y1) * ratio), 0, 100)
    }
  }

  return points[points.length - 1][1]
}

function getFallbackScores() {
  return {
    searchSpeed: 50,
    stability: 50,
    focus: 50,
    errorControl: 50,
    spatialMemory: 50,
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
