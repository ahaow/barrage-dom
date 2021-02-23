<template>
  <div class="barrage" id="barrage_comp">
    <div
      class="barrage-area"
      :style="{ opacity: alpha, font: font, padding: padding, zIndex: zIndex }"
    >
      <template v-for="(tunnel, tunnelId) in tunnels">
        <div
          class="barrage-tunnel"
          :key="tunnelId"
          :style="{
            height: tunnel.height ? tunnel.height + 'px' : '12px',
            borderTopWidth: tunnelShow ? 1 : 0,
          }"
        >
          <div class="tunnel-tips" v-show="tunnelShow">轨道{{ tunnelId }}</div>
          <div v-for="(bullet, bulletId) in tunnel.bullets" :key="bulletId">
            <div
              class="bullet-item"
              :class="[
                bullet.duration > 0 ? 'bullet-move' : '',
                bullet.paused ? 'paused' : '',
              ]"
              :style="{
                color: bullet.paused ? '#fff' : bullet.color,
                height: tunnel.height + 'px',
                lineHeight: tunnel.height + 'px',
                animationDuration: bullet.duration + 's',
                animationPlayState: bullet.paused ? 'paused' : 'running',
              }"
              :data-tunnelid="tunnelId"
              :data-bulletid="bulletId"
              @animationend="onAnimationend"
              @click="onTapBullet"
            >
              <div class="bullet-item_text" style="opacity: 1">
                <span>{{ bullet.content }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { Barrage } from "./barrage";
export default {
  name: "barrage",
  data() {
    return {
      width: null, // 容器宽度
      height: null, // 容器高度
      tunnelShow: true,
      barrageComp: null,
      barrage: null,
      //--------
      font: 14,
      zIndex: 9999,
      alpha: 1,
      padding: [],
      tunnels: [],
    };
  },
  methods: {
    initBarrage() {
      const rect = document
        .getElementById("barrage_comp")
        .getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;
      this.barrage = new Barrage({
        font: "14px",
        width: this.width,
        height: this.height * 50 / 100,
        comp: this,
        tunnelShow: this.tunnelShow,
      });
      this.barrage.open();
    },
    onAnimationend(e) {
      const target = e.target;
      const tunnelid = target.getAttribute("data-tunnelid");
      const bulletid = target.getAttribute("data-bulletid");
      this.barrage.animationend({
        tunnelId: tunnelid,
        bulletId: bulletid,
      });
    },
    onTapBullet() {
      console.log("onTapBullet");
    },
    handleSendBarrage() {
      let obj = {
        color: "red",
        content: "谢谢谢谢",
      };
      this.barrage.send(obj);
    },
  },
  mounted() {
    this.initBarrage();
  },
};
</script>

<style lang="scss" scoped>
.barrage {
  width: 1140px;
  height: 640px;
  background-color: #fff;
  border: 1px solid red;
  box-sizing: border-box;
  overflow: hidden;
}
.barrage-area {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}

.barrage-tunnel {
  box-sizing: border-box;
  position: relative;
  display: flex;
  align-items: center;
  border-top: 1px dashed #ccb24d;
  width: 100%;
}

.tunnel-tips {
  display: inline-block;
  margin-left: 10px;
  color: #ccb24d;
}

.bullet-item {
  position: absolute;
  display: flex;
  align-items: center;
  top: 0;
  left: 100%;
  white-space: nowrap;
}

.bullet-item.paused {
  background: #000;
  opacity: 0.6;
  padding: 0 10px;
  z-index: 1001;
}

.bullet-item_img {
  max-height: 100%;
  display: inline-block;
}

.bullet-item_text {
  display: inline-block;
  margin: 0;
}

.bullet-move {
  animation: 0s linear slidein;
}

@keyframes slidein {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(-1600px, 0, 0);
  }
}
</style>