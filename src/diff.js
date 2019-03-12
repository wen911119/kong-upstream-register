const _ = require("lodash");

const formatName = key => key.replace(/[:|.]/g, "-") + ".eureka.internal";

const diffNewEurekaAndOldEureka = (
  eurekaServicesInfoNew,
  eurekaServicesInfoOld
) => {
  if (_.isEmpty(eurekaServicesInfoNew)) {
    return null;
  }
  // 如果做的粗糙一点，直接用differenceWith(old, new, _.isEqual)找出要删除的upstream
  // 直接用differenceWith(new, old, _.isEqual)找出新增的upstream
  // 这里做的细致一点，先找出删的，再找出加的，最后再对更新的进一步对比
  // 先找出删除的
  const removedKeys = _.difference(
    Object.keys(eurekaServicesInfoOld),
    Object.keys(eurekaServicesInfoNew)
  ).map(key => {
    return {
      id: formatName(key)
    };
  });
  const addedKeys = _.difference(
    Object.keys(eurekaServicesInfoNew),
    Object.keys(eurekaServicesInfoOld)
  ).map(key => {
    return {
      name: formatName(key),
      targets: eurekaServicesInfoNew[key].map(instance => {
        return {
          target: `${instance.hostName}:${instance.port.$}`
        };
      })
    };
  });
  const updatedKeys = _.intersection(
    Object.keys(eurekaServicesInfoOld),
    Object.keys(eurekaServicesInfoNew)
  )
    .map(key => {
      return {
        id: formatName(key),
        targets: {
          remove: _.differenceWith(
            eurekaServicesInfoOld[key],
            eurekaServicesInfoNew[key],
            (arrVal, othVal) =>
              `${arrVal.hostName}:${arrVal.port.$}` ===
              `${othVal.hostName}:${othVal.port.$}`
          ).map(instance => {
            return {
              id: `${instance.hostName}:${instance.port.$}`
            };
          }),
          add: _.differenceWith(
            eurekaServicesInfoNew[key],
            eurekaServicesInfoOld[key],
            (arrVal, othVal) =>
              `${arrVal.hostName}:${arrVal.port.$}` ===
              `${othVal.hostName}:${othVal.port.$}`
          ).map(instance => {
            return {
              target: `${instance.hostName}:${instance.port.$}`
            };
          })
        }
      };
    })
    .filter(item => item.targets.add.length || item.targets.remove.length);
  if (
    removedKeys.length === 0 &&
    updatedKeys.length === 0 &&
    addedKeys.length === 0
  ) {
    return null;
  }
  return {
    remove: removedKeys,
    add: addedKeys,
    update: updatedKeys
  };
  // return {
  //   // 待删除upstreams
  //   remove: [
  //     {
  //       id: "upstream_id"
  //     }
  //   ],
  //   // 待更新upstreams
  //   update: [
  //     {
  //       id: "upstream_id",
  //       targets: {
  //         // 待删除targets（软删）
  //         remove: [
  //           {
  //             id: "target_id"
  //           }
  //         ],
  //         // 待新增targets
  //         add: [
  //           {
  //             target: "10.100.0.149:8080"
  //           }
  //         ]
  //       }
  //     }
  //   ],
  //   // 待新增upstreams
  //   add: [
  //     {
  //       name: "",
  //       targets: [
  //         {
  //           target: "10.100.0.149:8080"
  //         }
  //       ]
  //     }
  //   ]
  // };
};

const diffWithEurekaAndKong = (eurekaServicesInfo, kongUpStreamInfo) => {
  // const temp1 = {
  //   "LEO-SERVICE:1.0.0": [
  //     {
  //       instanceId: "209311e702f4:leo-service:1.0.0:15888",
  //       hostName: "10.42.170.191",
  //       app: "LEO-SERVICE:1.0.0",
  //       ipAddr: "10.42.170.191",
  //       status: "UP",
  //       overriddenstatus: "UNKNOWN",
  //       port: {
  //         $: 15888,
  //         "@enabled": "true"
  //       }
  //     }
  //   ]
  // };
  // const temp = [
  //   {
  //     id: "82cff905-2259-4b70-a968-72178fb10888",
  //     name: "TROY-SERVICE-1-0-0.eureka.internal",
  //     targets: [
  //       {
  //         id: "9f4f666c-fed6-4c50-b810-26027a9fdb42",
  //         target: "10.42.50.83:15033"
  //       }
  //     ]
  //   }
  // ];
  if (_.isEmpty(eurekaServicesInfo)) {
    return null;
  }

  const addedKeys = _.differenceWith(
    Object.keys(eurekaServicesInfo),
    kongUpStreamInfo.map(item => item.name),
    (arrVal, othVal) => formatName(arrVal) === othVal
  ).map(key => {
    return {
      name: formatName(key),
      targets: eurekaServicesInfo[key].map(instance => {
        return {
          target: `${instance.hostName}:${instance.port.$}`
        };
      })
    };
  });

  const removedKeys = _.differenceWith(
    kongUpStreamInfo.map(item => item.name),
    Object.keys(eurekaServicesInfo),
    (arrVal, othVal) => formatName(othVal) === arrVal
  ).map(key => {
    return {
      id: key
    };
  });

  const updatedKeys = _.intersectionWith(
    Object.keys(eurekaServicesInfo),
    kongUpStreamInfo.map(item => item.name),
    (arrVal, othVal) => formatName(arrVal) === othVal
  )
    .map(key => {
      let upStream = kongUpStreamInfo.find(k => k.name === formatName(key));
      return {
        // id: upStream.id,
        id: formatName(key),
        targets: {
          add: _.differenceWith(
            eurekaServicesInfo[key],
            upStream.targets,
            (arrVal, othVal) =>
              `${arrVal.hostName}:${arrVal.port.$}` === othVal.target
          ).map(item => {
            return {
              target: `${item.hostName}:${item.port.$}`
            };
          }),
          remove: _.differenceWith(
            upStream.targets,
            eurekaServicesInfo[key],
            (arrVal, othVal) =>
              `${othVal.hostName}:${othVal.port.$}` === arrVal.target
          ).map(item => {
            return {
              id: item.target
            };
          })
        }
      };
    })
    .filter(item => item.targets.add.length || item.targets.remove.length);

  if (
    removedKeys.length === 0 &&
    updatedKeys.length === 0 &&
    addedKeys.length === 0
  ) {
    return null;
  }
  return {
    // 待删除upstreams
    remove: removedKeys,
    // 待更新upstreams
    update: updatedKeys,
    // 待新增upstreams
    add: addedKeys
  };
};

module.exports = {
  diffNewEurekaAndOldEureka,
  diffWithEurekaAndKong
};
