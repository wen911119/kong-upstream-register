require("make-promises-safe");
const request = require("request-promise");
const { diffNewEurekaAndOldEureka } = require("./diff");
const _ = require("lodash");
const BBP = require("bluebird");

class EurekaFetcher {
  constructor(eurekaUrl) {
    this.urls = eurekaUrl.split(",");
    this.cache = null;
    this.getAllApps = this.getAllApps.bind(this);
    this.getChangedApps = this.getChangedApps.bind(this);
  }
  async getAllApps() {
    let ret = {};
    try {
      const rawInfo = await BBP.any(
        this.urls.map(url => request({ url, json: true }))
      );

      rawInfo.applications.application.forEach(item => {
        ret[item.name] = item.instance;
      });
    } catch (err) {
      console.log(err);
    }
    if (!_.isEmpty(ret) && !this.cache) {
      this.cache = ret;
    }
    return ret;
  }
  async getChangedApps() {
    let changed = null;
    try {
      const apps = await this.getAllApps();
      changed = diffNewEurekaAndOldEureka(apps, this.cache);
      if (changed && !_.isElement(apps)) {
        this.cache = apps;
      }
    } catch (err) {
      console.log(err);
    }
    return changed;
  }
}

module.exports = EurekaFetcher;
