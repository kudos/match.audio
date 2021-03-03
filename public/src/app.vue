<template>
  <div id="app">
    <div class="header" v-bind:class="{ 'share': this.$router.currentRoute.path !== '/' }">
      <div class="container">
        <h1 class="title">
          <router-link to="/" exact>
            <img src="/assets/images/logo-128.png"><b>combine</b><span class="lighter">.fm</span>
          </router-link>
        </h1>
      </div>
    </div>
    <div>
      <router-view></router-view>
    </div>
    <div class="footer-break">
    </div>
    <footer class="footer">
      <div class="container has-text-right">
        <a rel="me" href='https://mastodon.social/@kudos'>Toot</a>, <a href='https://twitter.com/combinefm'>Tweet</a> or <a href='https://github.com/kudos/combine.fm'>Fork</a>. A work in progress by <a href='http://crem.in'>this guy</a>.
      </div>
    </footer>
  </div>
</template>

<style lang="scss">
@import url('https://fonts.googleapis.com/css?family=Comfortaa');

@import "scss/_variables.scss";
@import "bulma/sass/utilities/_all.sass";
@import "bulma/sass/base/_all.sass";
@import "bulma/sass/helpers/_all.sass";
@import "bulma/sass/elements/title.sass";
@import "bulma/sass/elements/button.sass";
@import "bulma/sass/elements/container.sass";
@import "bulma/sass/elements/notification.sass";
@import "bulma/sass/elements/other.sass";
@import "bulma/sass/grid/_all.sass";
@import "bulma/sass/form/_all.sass";


html {
  position: relative;
  min-height: 100%;
}

body {
  color: $grey;
  background: #fff;
  margin: 0 0 160px;
}

.header {
  font-family: $family-title;
  letter-spacing: -2px;
  background: $primary;
}

.header img {
  height: 64px;
}

h1 {
  text-align: center;
  padding: 10px 0;
}

h1 a {
  color: #fff;
}

h1 a:hover {
  color: #ffacc5;
}

.share {
  margin-bottom: 40px;
}

.share h1 {
  text-align: left;
  font-size: 1.5em;
  line-height: 36px;
  padding: 5px 0;
}

.share h1 img {
  height: 40px;
}

.title a:hover {
  border-bottom: none;
}

h1 .lighter {
  color: #ffacc5;
}

.footer-break {
  height: 1px;
}

.footer {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  padding: 40px 24px 40px 24px;
}

.artwork {
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 100%;
  background-repeat: no-repeat;
  background-size: cover;
  border-radius: 5px;
}

.artwork-youtube {
  background-position: 50% 0%;
}
</style>
