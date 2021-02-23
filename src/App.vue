<template>
  <div id="app">
    <barrage-comp ref="barrageRef"></barrage-comp>
    <div style="margin-top: 10px;">
      <button @click="handleSendBarrage">发送弹幕</button>
    </div>
  </div>
</template>

<script>
import BarrageComp from "./barrage/index";
export default {
  name: "App",
  components: {
    BarrageComp,
  },
  methods: {
    handleSendBarrage() {
      this.barrageRef.handleSendBarrage();
    },
  },
  mounted() {
    this.barrageRef = this.$refs.barrageRef;
  }
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
