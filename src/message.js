var Message;

Message = (function() {
  function Message(_client, data) {
    var k;
    this._client = _client;
    if (data == null) {
      data = {};
    }
    for (k in data || {}) {
      this[k] = data[k];
    }
  }

  Message.prototype.toJSON = function() {
    var m;
    m = {};
    m['id'] = this.id ? this.id : 1;
    m['type'] = this.type ? this.type : 'message';
    m['channel'] = this.channel;
    m['text'] = this.text;
    return m;
  };

  Message.prototype.getBody = function() {
    var attach, k, txt, _ref;
    txt = "";
    if (this.text) {
      txt += this.text;
    }
    if (this.attachments) {
      if (this.text) {
        txt += "\n";
      }
      _ref = this.attachments;
      for (k in _ref) {
        attach = _ref[k];
        if (k > 0) {
          txt += "\n";
        }
        txt += attach.fallback;
      }
    }
    return txt;
  };

  Message.prototype.toString = function() {
    var body, channel, str, user;
    if (this.hidden) {
      return '';
    }
    if (!this.text && !this.attachments) {
      return '';
    }
    str = "";
    channel = this._client.getChannelGroupOrDMByID(this.channel);
    if (channel) {
      str += channel.name + ' > ';
    }
    user = this._client.getUserByID(this.user);
    if (user) {
      str += user.name + ': ';
    } else if (this.username) {
      str += this.username;
      if (this._client.getUserByName(this.username)) {
        str += ' (bot): ';
      } else {
        str += ': ';
      }
    }
    body = this.getBody();
    if (body) {
      str += body;
    }
    return str;
  };

  Message.prototype.getChannelType = function() {
    var channel;
    channel = this._client.getChannelGroupOrDMByID(this.channel);
    if (!channel) {
      return '';
    }
    return channel.getType();
  };

  return Message;

})();

module.exports = Message;
