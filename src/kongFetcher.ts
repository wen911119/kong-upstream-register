import("make-promises-safe");
import request from "request-promise";
import _ from "lodash";

export interface UpStream {
  id?: string;
  name?: string;
}

export interface Target {
  id?: string;
  target?: string;
}

export interface UpStreamWithTargets extends UpStream {
  targets: Target[];
}

export interface UpStreamToUpdate extends UpStream {
  targets: TargetsUpdateDescriber;
}

export interface TargetsUpdateDescriber {
  remove: Target[];
  add: Target[];
}

class KongFetcher {
  private url: string;
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
  public async getAllUpstreams() {
    let upstreams: UpStreamWithTargets[] = [];
    try {
      let nextUrl = `${this.url}/upstreams`;
      let rets = [];
      while (nextUrl) {
        const { data, next } = await request({
          url: nextUrl,
          json: true
        });
        nextUrl = next;
        rets = rets.concat(data);
      }
      if (rets && rets.length) {
        const retsSets = _.chunk(rets, 20);
        let jobs: any[] = retsSets.pop();
        while (jobs) {
          let temp = await Promise.all(
            jobs.map(async item => {
              const targets = await this.getTargets(item.id);
              return {
                id: item.id,
                name: item.name,
                targets
              };
            })
          );
          upstreams = upstreams.concat(temp);
          jobs = retsSets.pop();
        }
      }
    } catch (err) {
      console.log(err.toString());
    }
    return upstreams;
  }

  public getUpstreams(upstreamIdsArr: string[]) {
    return upstreamIdsArr.map(this.getUpstream);
  }
  public async getUpstream(upstreamId: string) {
    let upstream: UpStream = {};
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
  public async addUpstream(upstreamToAdd: UpStreamWithTargets) {
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
  public async addUpstreams(upstreamsToAdd: UpStreamWithTargets[]) {
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
  public async deleteUpstream(upstreamId: string) {
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
  public async deleteUpstreams(upstreams: UpStreamWithTargets[]) {
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
  public async updateUpstreams(upstreamsToUpdate: UpStreamToUpdate[]) {
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
  public async updateUpstream(updateDescriber: UpStreamToUpdate) {
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
  public async getTargets(upstreamId: string) {
    let targets: Target[] = [];
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
  public async addTargets(upstreamId: string, targets: Target[]) {
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
  public async addTarget(upstreamId: string, target: Target) {
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
  public async deleteTargets(upstreamId: string, targets: Target[]) {
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
  public async deleteTarget(upstreamId: string, target: Target) {
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

export default KongFetcher;
