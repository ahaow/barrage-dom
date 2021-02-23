// 获取字节长度，中文算2个字节
function getStrLen(str) {
    // eslint-disable-next-line no-control-regex
    return str.replace(/[^\x00-\xff]/g, 'aa').length;
}
// 截取指定字节长度的子串
function substring(str, n) {
    if (!str)
        return '';
    var len = getStrLen(str);
    if (n >= len)
        return str;
    var l = 0;
    var result = '';
    for (var i = 0; i < str.length; i++) {
        var ch = str.charAt(i);
        // eslint-disable-next-line no-control-regex
        l = /[^\x00-\xff]/i.test(ch) ? l + 2 : l + 1;
        result += ch;
        if (l >= n)
            break;
    }
    return result;
}
function getRandom(max, min) {
    if (max === void 0) { max = 10; }
    if (min === void 0) { min = 0; }
    return Math.floor(Math.random() * (max - min) + min);
}
function getFontSize(font) {
    var reg = /(\d+)(px)/i;
    var match = font.match(reg);
    return (match && match[1]) || 10;
}
function compareVersion(v1, v2) {
    v1 = v1.split('.');
    v2 = v2.split('.');
    var len = Math.max(v1.length, v2.length);
    while (v1.length < len) {
        v1.push('0');
    }
    while (v2.length < len) {
        v2.push('0');
    }
    for (var i = 0; i < len; i++) {
        var num1 = parseInt(v1[i], 10);
        var num2 = parseInt(v2[i], 10);
        if (num1 > num2) {
            return 1;
        }
        else if (num1 < num2) {
            return -1;
        }
    }
    return 0;
}
var getType = function (obj) { return Object.prototype.toString.call(obj).slice(8, -1); };
var isArray = function (obj) { return getType(obj) === 'Array'; };
class Bullet {
    constructor(opt = {}) {
        this.bulletId = opt.bulletId
        this.addContent(opt)
    }

    /**
     * image 结构
     * {
     *   head: {src, width, height},
     *   tail: {src, width, height},
     *   gap: 4 // 图片与文本间隔
     * }
     */
    addContent(opt = {}) {
        const defaultBulletOpt = {
            duration: 0, // 动画时长
            passtime: 0, // 弹幕穿越右边界耗时
            content: '', // 文本
            color: '#000000', // 默认黑色
            width: 0, // 弹幕宽度
            height: 0, // 弹幕高度
            image: {}, // 图片
            paused: false // 是否暂停
        }
        Object.assign(this, defaultBulletOpt, opt)
    }

    removeContent() {
        this.addContent({})
    }
}

// tunnel（轨道）
class Tunnel {
    constructor(opt = {}) {
        const defaultTunnelOpt = {
            tunnelId: 0,
            height: 0, // 轨道高度
            width: 0, // 轨道宽度
            safeGap: 4, // 相邻弹幕安全间隔
            maxNum: 10, // 缓冲队列长度
            bullets: [], // 弹幕
            last: -1, // 上一条发送的弹幕序号
            bulletStatus: [], // 0 空闲，1 占用中
            disabled: false, // 禁用中
            sending: false, // 弹幕正在发送
            timer: null, // 定时器
        }
        Object.assign(this, defaultTunnelOpt, opt)
        this.bulletStatus = new Array(this.maxNum).fill(0)
        for (let i = 0; i < this.maxNum; i++) {
            this.bullets.push(new Bullet({
                bulletId: i,
            }))
        }
    }

    disable() {
        this.disabled = true
        this.last = -1
        this.sending = false
        this.bulletStatus = new Array(this.maxNum).fill(1)
        this.bullets.forEach(bullet => bullet.removeContent())
    }

    enable() {
        if (this.disabled) {
            this.bulletStatus = new Array(this.maxNum).fill(0)
        }
        this.disabled = false
    }

    clear() {
        this.last = -1
        this.sending = false
        this.bulletStatus = new Array(this.maxNum).fill(0)
        this.bullets.forEach(bullet => bullet.removeContent())
        if (this.timer) {
            clearTimeout(this.timer)
        }
    }

    getIdleBulletIdx() {
        let idle = this.bulletStatus.indexOf(0, this.last + 1)
        if (idle === -1) {
            idle = this.bulletStatus.indexOf(0)
        }

        return idle
    }

    getIdleBulletNum() {
        let count = 0
        this.bulletStatus.forEach(status => {
            if (status === 0) count++
        })
        return count
    }

    addBullet(opt) {
        if (this.disabled) return
        const idx = this.getIdleBulletIdx()
        if (idx >= 0) {
            this.bulletStatus[idx] = 1
            this.bullets[idx].addContent(opt)
        }
    }

    removeBullet(bulletId) {
        if (this.disabled) return
        this.bulletStatus[bulletId] = 0
        const bullet = this.bullets[bulletId]
        bullet.removeContent()
    }
}

// Barrage(控制中心)
export class Barrage {
    constructor(opt = {}) {
        const defaultBarrageOpt = {
            duration: 10, // 弹幕动画时长
            lineHeight: 1.2, // 弹幕行高
            padding: [0, 0, 0, 0], // 弹幕区四周留白
            alpha: 1, // 全局透明度
            font: '10px sans-serif', // 全局字体
            mode: 'separate', // 弹幕重叠 overlap  不重叠 separate
            range: [0, 1], // 弹幕显示的垂直范围，支持两个值。[0,1]表示弹幕整个随机分布，
            tunnelShow: false, // 显示轨道线
            tunnelMaxNum: 30, // 隧道最大缓冲长度
            maxLength: 30, // 弹幕最大字节长度，汉字算双字节
            safeGap: 4, // 发送时的安全间隔
            enableTap: false, // 点击弹幕停止动画高亮显示
            tunnelHeight: 0,
            tunnelNum: 0,
            tunnels: [],
            idleTunnels: null,
            enableTunnels: null,
            distance: 2000,
            comp: null, // 组件实例
        }
        Object.assign(this, defaultBarrageOpt, opt)
        this._ready = false
        this._deferred = []

        this.init(this)
        this.ready()
    }

    ready() {
        this._ready = true
        this._deferred.forEach(item => {
            // eslint-disable-next-line prefer-spread
            this[item.callback].apply(this, item.args)
        })

        this._deferred = []
    }

    _delay(method, ...params) {
        this._deferred.push({
            callback: method,
            args: params
        })
    }

    init(opt) {
        this.width = opt.width
        this.height = opt.height
        this.fontSize = getFontSize(this.font)
        this.idleTunnels = new Set()
        this.enableTunnels = new Set()
        this.tunnels = []
        this.availableHeight = (this.height - this.padding[0] - this.padding[2])
        this.tunnelHeight = this.fontSize * this.lineHeight
        this.tunnelNum = Math.floor(this.availableHeight / this.tunnelHeight)
        for (let i = 0; i < this.tunnelNum; i++) {
            this.idleTunnels.add(i) // 空闲的隧道id集合
            this.enableTunnels.add(i) // 可用的隧道id集合

            this.tunnels.push(new Tunnel({ // 隧道集合
                width: this.width,
                height: this.tunnelHeight,
                safeGap: this.safeGap,
                maxNum: this.tunnelMaxNum,
                tunnelId: i,
            }))
        }
        this.comp.fontSize = this.fontSize;
        this.comp.tunnelShow = this.tunnelShow;
        this.comp.tunnels = this.tunnels;

        this.comp.font = this.font;
        this.comp.alpha = this.alpha;
        this.comp.padding = this.padding.map(item => item + 'px').join(' ')
        // 筛选符合范围的隧道
        this.setRange()
    }

    // 设置显示范围 range: [0,1]
    setRange(range) {
        if (!this._ready) {
            this._delay('setRange', range)
            return
        }

        range = range || this.range
        const top = range[0] * this.tunnelNum
        const bottom = range[1] * this.tunnelNum
        // 释放符合要求的隧道
        // 找到目前空闲的隧道
        const idleTunnels = new Set()
        const enableTunnels = new Set()
        this.tunnels.forEach((tunnel, tunnelId) => {
            if (tunnelId >= top && tunnelId < bottom) {
                const disabled = tunnel.disabled
                tunnel.enable()
                enableTunnels.add(tunnelId)

                if (disabled || this.idleTunnels.has(tunnelId)) {
                    idleTunnels.add(tunnelId)
                }
            } else {
                tunnel.disable()
            }
        })
        this.idleTunnels = idleTunnels
        this.enableTunnels = enableTunnels
        this.range = range
        this.comp.tunnels = this.tunnels;
        // this.comp.setData({ tunnels: this.tunnels })
    }

    setFont(font) {
        if (!this._ready) {
            this._delay('setFont', font)
            return
        }

        if (typeof font !== 'string') return
        this.font = font
        this.comp.font = font;
        // this.comp.setData({ font })
    }

    setAlpha(alpha) {
        if (!this._ready) {
            this._delay('setAlpha', alpha)
            return
        }

        if (typeof alpha !== 'number') return
        this.alpha = alpha
        this.comp.alpha = alpha
        // this.comp.setData({ alpha })
    }

    setDuration(duration) {
        if (!this._ready) {
            this._delay('setDuration', duration)
            return
        }

        if (typeof duration !== 'number') return
        this.duration = duration
        this.clear()
    }

    // 开启弹幕
    open() {
        if (!this._ready) {
            this._delay('open')
            return
        }

        this._isActive = true
    }

    // 关闭弹幕，清除所有数据
    close() {
        if (!this._ready) {
            this._delay('close')
            return
        }

        this._isActive = false
        this.clear()
    }

    clear() {
        this.tunnels.forEach(tunnel => tunnel.clear())
        this.idleTunnels = new Set(this.enableTunnels)
        this.comp.tunnels = this.tunnels
        // this.comp.setData({ tunnels: this.tunnels })
    }

    // 添加一批弹幕，轨道满时会被丢弃
    addData(data = []) {
        if (!isArray(data)) return

        if (!this._ready) {
            this._delay('addData', data)
            return
        }
        if (!this._isActive) return

        data.forEach(item => {
            item.content = substring(item.content, this.maxLength)
            this.addBullet2Tunnel(item)
        })
        this.comp.tunnels = this.tunnels
        setTimeout(() => {
            this.updateBullets()
        }, 0)
        // this.comp.setData({
        //     tunnels: this.tunnels
        // }, () => {
        //     this.updateBullets()
        // })
    }

    // 发送一条弹幕
    send(opt = {}) {
        if (!this._ready) {
            this._delay('send', opt)
            return
        }
        const tunnel = this.getEnableTunnel()
        if (tunnel === null) return

        const timer = setInterval(() => {
            const tunnel = this.getIdleTunnel()
            if (tunnel) {
                this.addData([opt])
                clearInterval(timer)
            }
        }, 16)
    }

    // 添加至轨道
    addBullet2Tunnel(opt = {}) {
        const tunnel = this.getIdleTunnel()
        if (tunnel === null) return

        const tunnelId = tunnel.tunnelId
        tunnel.addBullet(opt)
        if (tunnel.getIdleBulletNum() === 0) this.removeIdleTunnel(tunnelId)
    }

    updateBullets() {
        const self = this
        const bulletEls = document.querySelectorAll(".bullet-item")
        if (!this._isActive) return
        bulletEls.forEach(item => {
            const tunnelid = item.getAttribute("data-tunnelid")
            const bulletid = item.getAttribute("data-bulletid")
            const res = item.getBoundingClientRect()
            const tunnel = self.tunnels[tunnelid]
            const bullet = tunnel.bullets[bulletid]
            bullet.width = res.width
            bullet.height = res.height
        })   
        self.animate()
        // const self = this
        // const query = this.comp.createSelectorQuery()
        // query.selectAll('.bullet-item').boundingClientRect((res) => {
        //     if (!this._isActive) return

        //     for (let i = 0; i < res.length; i++) {
        //         const { tunnelid, bulletid } = res[i].dataset
        //         const tunnel = self.tunnels[tunnelid]
        //         const bullet = tunnel.bullets[bulletid]
        //         bullet.width = res[i].width
        //         bullet.height = res[i].height
        //     }
        //     self.animate()
        // }).exec()
    }

    animate() {
        this.tunnels.forEach(tunnel => {
            this.tunnelAnimate(tunnel)
        })
    }

    tunnelAnimate(tunnel) {
        if (tunnel.disabled || tunnel.sending || !this._isActive) return

        const next = (tunnel.last + 1) % tunnel.maxNum
        const bullet = tunnel.bullets[next]

        if (!bullet) return

        if (bullet.content || bullet.image.head || bullet.image.tail) {
            tunnel.sending = true
            tunnel.last = next
            let duration = this.duration
            if (this.mode === 'overlap') {
                duration = this.distance * this.duration / (this.distance + bullet.width)
            }
            const passDistance = bullet.width + tunnel.safeGap
            bullet.duration = duration
            // 等上一条通过右边界
            bullet.passtime = Math.ceil(passDistance * bullet.duration * 1000 / this.distance)
            // this.comp.setData({
            //     [`tunnels[${tunnel.tunnelId}].bullets[${bullet.bulletId}]`]: bullet
            // }, () => {
            //     tunnel.timer = setTimeout(() => {
            //         tunnel.sending = false
            //         this.tunnelAnimate(tunnel)
            //     }, bullet.passtime)
            // })
            this.comp[`tunnels[${tunnel.tunnelId}].bullets[${bullet.bulletId}]`] = bullet;
            setTimeout(() => {
                tunnel.timer = setTimeout(() => {
                    tunnel.sending = false
                    this.tunnelAnimate(tunnel)
                }, bullet.passtime)
            }, 80)
        }
    }

    showTunnel() {
        this.comp.tunnelShow = true;
    }

    hideTunnel() {
        this.comp.tunnelShow = false;
    }

    removeIdleTunnel(tunnelId) {
        this.idleTunnels.delete(tunnelId)
    }

    addIdleTunnel(tunnelId) {
        this.idleTunnels.add(tunnelId)
    }

    // 从可用的隧道中随机挑选一个
    getEnableTunnel() {
        if (this.enableTunnels.size === 0) return null
        const enableTunnels = Array.from(this.enableTunnels)
        const index = getRandom(enableTunnels.length)
        return this.tunnels[enableTunnels[index]]
    }

    // 从还有余量的隧道中随机挑选一个
    getIdleTunnel() {
        if (this.idleTunnels.size === 0) return null
        const idleTunnels = Array.from(this.idleTunnels)
        const index = getRandom(idleTunnels.length)
        return this.tunnels[idleTunnels[index]]
    }

    animationend(opt) {
        const { tunnelId, bulletId } = opt
        const tunnel = this.tunnels[tunnelId]
        if (!tunnel) return

        const bullet = tunnel.bullets[bulletId]
        if (!bullet) return

        tunnel.removeBullet(bulletId)
        this.addIdleTunnel(tunnelId)
        // this.comp.setData({
        //     [`tunnels[${tunnelId}].bullets[${bulletId}]`]: bullet
        // })
        this.comp[`tunnels[${tunnelId}].bullets[${bulletId}]`] = bullet
    }

    tapBullet(opt) {
        if (!this.enableTap) return

        const { tunnelId, bulletId } = opt
        const tunnel = this.tunnels[tunnelId]
        const bullet = tunnel.bullets[bulletId]
        bullet.paused = !bullet.paused
        // this.comp.setData({
        //     [`tunnels[${tunnelId}].bullets[${bulletId}]`]: bullet
        // })
        this.comp[`tunnels[${tunnelId}].bullets[${bulletId}]`] = bullet
    }
}