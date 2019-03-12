const EurekaFetcher = require("./eurekaFetcher");
const KongFetcher = require("./KongFetcher");
const { diffWithEurekaAndKong } = require("./diff");
const EUREKA_URLS =
  process.env.EUREKA_URLS || "http://eureka.dev.quancheng-ec.com/eureka/apps";
const KONG_HOST = process.env.KONG_HOST || "http://10.100.0.149:8001";
const UPDATE_INTERVAL = process.env.UPDATE_INTERVAL || 3000;
const MULTIPLE = process.env.MULTIPLE || 30;
const eureka = new EurekaFetcher(EUREKA_URLS);
const kong = new KongFetcher(KONG_HOST);

const sync = async ({ add = [], update = [], remove = [] }) => {
  const results = await Promise.all([
    kong.addUpstreams(add),
    kong.deleteUpstreams(remove),
    kong.updateUpstreams(update)
  ]);
  return results.every(r => r);
};

// 增量对比同步
const incrementalSync = async () => {
  const diff = await eureka.getChangedApps();
  if (diff) {
    console.log("增量diff", diff);
    return sync(diff);
  }
  return true;
};

// 全量对比同步
// 代价较大,应用启动首次和每60秒进行一次
const fullSync = async () => {
  const [services, upstreams] = await Promise.all([
    eureka.getAllApps(),
    kong.getAllUpstreams()
  ]);
  const diff = diffWithEurekaAndKong(services, upstreams);
  if (diff) {
    console.log("全量对比diff", diff);
    return sync(diff);
  }
  return true;
};

(async () => {
  const fullSyncSuccess = await fullSync();
  console.log(`首次全量对比同步${fullSyncSuccess ? "成功" : "失败"}！`);
  let count = 0;
  const start = async () => {
    if (count === MULTIPLE) {
      await fullSync();
      count = 0;
    } else {
      await incrementalSync();
      count++;
    }
    setTimeout(start, UPDATE_INTERVAL);
  };
  start();
})();
