import("make-promises-safe");
import request from "request-promise";
import { diffNewEurekaAndOldEureka } from "./diff";
import _ from "lodash";
import * as BBP from "bluebird";
import { ChangedAppsInfo } from './diff';

export interface EurekaAppInfo {
  hostName: string;
  port: {
    $: number;
  };
}

export interface EurekaAppsInfoMap {
  [propName: string]: EurekaAppInfo[];
}

class EurekaFetcher {
  private urls: string[];
  private cache: EurekaAppsInfoMap | null;
  constructor(eurekaUrl: string) {
    this.urls = eurekaUrl.split(",");
    this.cache = null;
    this.getAllApps = this.getAllApps.bind(this)
    this.getChangedApps = this.getChangedApps.bind(this)
  }
  public async getAllApps() {
    let ret: EurekaAppsInfoMap = {};
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
  public async getChangedApps() {
    let changed: ChangedAppsInfo = null;
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

export default EurekaFetcher;
