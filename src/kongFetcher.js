require("make-promises-safe");
const request = require("request-promise");
const _ = require("lodash");

class KongFetcher {
  constructor(kongAdminUrl) {
    this.url = kongAdminUrl;
    this.getAllUpstreams = this.getAllUpstreams.bind(this);
    this.getUpstreams = this.getUpstreams.bind(this);
    this.getUpstream = this.getUpstream.bind(this);
    this.addUpstream = this.addUpstream.bind(this);
    this.addUpstreams = this.addUpstreams.bind(this);
    this.deleteUpstream = this.deleteUpstream.bind(this);
    this.deleteUpstreams = this.deleteUpstreams.bind(this);
    this.updateUpstreams = this.updateUpstreams.bind(this);
    this.updateUpstream = this.updateUpstream.bind(this);
    this.getTargets = this.getTargets.bind(this);
    this.addTargets = this.addTargets.bind(this);
    this.addTarget = this.addTarget.bind(this);
    this.deleteTargets = this.deleteTargets.bind(this);
    this.deleteTarget = this.deleteTarget.bind(this);
  }
  async getAllUpstreams() {
    let upstreams = [];
    try {
      let nextUrl = `/upstreams`;
      let rets = [];
      while (nextUrl) {
        const { data, next } = await request({
          url: `${this.url}${nextUrl}`,
          json: true
        });
        nextUrl = next;
        rets = rets.concat(data);
      }
      if (rets && rets.length) {
        upstreams = await Promise.all(
          rets.map(async item => {
            const targets = await this.getTargets(item.id);
            return {
              id: item.id,
              name: item.name,
              targets
            };
          })
        );
      }
    } catch (err) {
      console.log(err.toString());
    }
    return upstreams;
  }
  async getUpstreams(upstreamIdsArr) {
    return upstreamIdsArr.map(this.getUpstream);
  }
  async getUpstream(upstreamId) {
    let upstream = {};
    try {
      const { data } = await request({
        url: `${this.url}/upstreams/${upstreamId}`,
        json: true
      });
      if (data && data.id) {
        upstream = data;
      }
    } catch (err) {
      console.log(err.toString());
    }
    return upstream;
  }
  async addUpstream(upstreamToAdd) {
    let ret = false;
    try {
      const { name, targets } = upstreamToAdd;
      const upstreamAdded = await request({
        url: `${this.url}/upstreams`,
        method: "POST",
        json: true,
        body: {
          name
        }
      });
      ret = await this.addTargets(upstreamAdded.id, targets);
    } catch (err) {
      console.log(err.toString());
    }
    return ret;
  }
  async addUpstreams(upstreamsToAdd) {
    if (upstreamsToAdd.length === 0) {
      return true;
    }
    let ret = false;
    try {
      const results = await Promise.all(upstreamsToAdd.map(this.addUpstream));
      ret = results.every(r => r);
    } catch (err) {
      console.log(err.toString());
    }
    return ret;
  }
  async deleteUpstream(upstreamId) {
    let ret = false;
    try {
      await request({
        url: `${this.url}/upstreams/${upstreamId}`,
        method: "DELETE"
      });
      ret = true;
    } catch (err) {
      console.log(err.toString());
    }
    return ret;
  }
  async deleteUpstreams(upstreams) {
    let ret = false;
    if (upstreams.length == 0) {
      return true;
    }
    try {
      const results = await Promise.all(
        upstreams.map(u => u.id).map(this.deleteUpstream)
      );
      ret = results.every(r => r);
    } catch (err) {
      console.log(err.toString());
    }
    return ret;
  }
  async updateUpstreams(upstreamsToUpdate) {
    if (upstreamsToUpdate.length === 0) {
      return true;
    }
    let ret = false;
    try {
      const results = await Promise.all(
        upstreamsToUpdate.map(this.updateUpstream)
      );
      ret = results.every(r => r);
    } catch (err) {
      console.log(err.toString());
    }
    return ret;
  }
  async updateUpstream(updateDescriber) {
    const { id, targets } = updateDescriber;
    const { add = [], remove = [] } = targets;
    let ret = false;
    try {
      const results = await Promise.all([
        this.addTargets(id, add),
        this.deleteTargets(id, remove)
      ]);
      ret = results.every(r => r);
    } catch (err) {
      console.log(err.toString());
    }
    return ret;
  }
  async getTargets(upstreamId) {
    let targets = [];
    try {
      const { data } = await request({
        url: `${this.url}/upstreams/${upstreamId}/targets`,
        json: true
      });
      if (data && data.length) {
        targets = data.map(item => _.pick(item, ["id", "target"]));
      }
    } catch (err) {
      console.log(err.toString());
    }
    return targets;
  }
  async addTargets(upstreamId, targets) {
    if (targets.length === 0) {
      return true;
    }
    let ret = false;
    try {
      const results = await Promise.all(
        targets.map(target => this.addTarget(upstreamId, target))
      );
      ret = results.every(r => r);
    } catch (err) {
      console.log(err.toString());
    }
    return ret;
  }
  async addTarget(upstreamId, target) {
    let ret = false;
    try {
      const result = await request({
        url: `${this.url}/upstreams/${upstreamId}/targets`,
        method: "POST",
        body: {
          target: target.target
        },
        json: true
      });
      ret = !!(result && result.id);
    } catch (err) {
      console.log(err.toString(), upstreamId, target);
    }
    return ret;
  }
  async deleteTargets(upstreamId, targets) {
    if (targets.length === 0) {
      return true;
    }
    let ret = false;
    try {
      const results = await Promise.all(
        targets.map(t => this.deleteTarget(upstreamId, t))
      );
      ret = results.every(r => r);
    } catch (err) {
      console.log(err.toString());
    }
    return ret;
  }
  async deleteTarget(upstreamId, target) {
    let ret = false;
    try {
      await request({
        url: `${this.url}/upstreams/${upstreamId}/targets/${target.id}`,
        method: "DELETE"
      });
      ret = true;
    } catch (err) {
      console.log(err.toString());
    }
    return ret;
  }
}

module.exports = KongFetcher;
