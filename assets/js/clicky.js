var clicky_obj =
  clicky_obj ||
  (function () {
    var instance = null;
    function _ins() {
      this.sitekeys = [];
      var _self = this,
        site_ids = [],
        pageviews_fired = [],
        monitors = 0,
        setup = 0,
        ossassets = 0,
        ossdata = 0;
      this.domain = "http://in.getclicky.com";
      if (location.protocol === "https:") {
        this.domain = "https://in.getclicky.com";
      }
      this.site_id_exists = function (site_id) {
        for (var s in site_ids) if (site_ids[s] == site_id) return true;
        return false;
      };
      this.sitekey = function (site_id, key_only) {
        if (_self.sitekeys && _self.sitekeys[site_id])
          return (key_only ? "" : "&sitekey=") + _self.sitekeys[site_id];
        return "";
      };
      this.init = function (site_id) {
        if (_self.site_id_exists(site_id)) return;
        site_ids.push(site_id);
        if (!setup) {
          setup = 1;
          setTimeout(_self.setup, 200);
        }
      };
      this.setup = function () {
        if (location.hash.match(/^#_heatmap/)) _self.heatmap();
        if (!_self.get_cookie("_first_pageview")) {
          _self.set_referrer();
          _self.set_cookie("_first_pageview", 1, 600);
        }
        setTimeout(_self.advanced, 1000);
        _self.start_monitors();
        if (!clicky_custom.pageview_disable) {
          if (window.olark && typeof olark == "function") {
            olark("api.boot.onIdentityReady", function (s, v, c) {
              _self.olark(s, v, c, 1);
            });
            setTimeout(function () {
              _self.pageview(1);
            }, 2000);
          } else {
            _self.pageview(1);
          }
        }
      };
      this.custom_data = function () {
        var data = {},
          keys = clicky_custom.visitor_keys_cookie || ["username", "name", "email"],
          l = keys.length;
        for (var i = 0; i < l; i++) {
          var key = keys[i],
            temp = "";
          temp = _self.get_cookie("_custom_data_" + key);
          if (temp) data[key] = temp;
          if (clicky_custom.visitor) {
            temp = clicky_custom.visitor[key];
            if (temp) {
              data[key] = temp;
              if (clicky_custom.visitor_consent)
                _self.set_cookie("_custom_data_" + key, temp, 30 * 86400);
            }
          }
          if (location.search.match(/utm_custom/)) {
            temp = location.search.split("utm_custom[" + key + "]");
            if (temp[1]) {
              temp = temp[1].split("&")[0].split("=")[1];
              if (temp) {
                data[key] = temp;
                if (clicky_custom.visitor_consent)
                  _self.set_cookie("_custom_data_" + key, temp, 30 * 86400);
              }
            }
          }
        }
        var url = "";
        if (clicky_custom.visitor) {
          for (var i in clicky_custom.visitor) {
            if (clicky_custom.visitor.hasOwnProperty && clicky_custom.visitor.hasOwnProperty(i))
              if (!data[i]) data[i] = clicky_custom.visitor[i];
          }
        }
        if (data) {
          for (var i in data) {
            if (data.hasOwnProperty && data.hasOwnProperty(i))
              url += "&custom[" + _self.enc(i) + "]=" + _self.enc(data[i]);
          }
        }
        return url;
      };
      this.set_referrer = function () {
        var r = clicky_custom.iframe ? top.document.referrer : document.referrer;
        r =
          r && r.match(/^https?:/)
            ? RegExp("^https?://[^/]*" + location.host.replace(/^www\./i, "") + "/", "i").test(r)
              ? ""
              : r
            : "";
        if (r) {
          _self.set_cookie("_referrer_og", r, 86400 * 90);
        } else {
          r = _self.get_cookie("_referrer_og");
        }
        _self.ref = r;
        if (!_self.get_href().match(/utm_campaign/)) {
          _self.utm = _self.get_cookie("_utm_og");
        }
      };
      this.olark = function (s, v, c, do_pageview) {
        var o = s + "," + v + "," + c,
          c = _self.get_cookie("clicky_olark");
        if (c && c == o) {
          if (do_pageview) _self.pageview(1);
          return;
        } else {
          if (c) _self.set_cookie("clicky_olark", c, -3600);
          _self.set_cookie("clicky_olark", o, 600);
          c = _self.get_cookie("clicky_olark");
        }
        if (do_pageview || pageviews_fired.length == 0) {
          _self.pageview(1, "&olark=" + o);
        } else if (c) {
          _self.beacon("ping", "&olark=" + o);
        }
      };
      this.pageview = function (only_once, extra) {
        var href = _self.get_href();
        if (_self.facebook_is_lame(href)) return;
        _self.beacon(
          "pageview",
          "&href=" +
            _self.enc(href) +
            "&title=" +
            _self.enc(clicky_custom.title || window.clicky_page_title || document.title) +
            "&res=" +
            screen.width +
            "x" +
            screen.height +
            "&lang=" +
            (navigator.language || navigator.browserLanguage || "en").substr(0, 2) +
            (_self.ref ? "&ref=" + _self.enc(_self.ref) : "") +
            (_self.utm ? "&utm=" + _self.enc(_self.utm) : "") +
            (extra || ""),
          only_once ? 1 : 0,
        );
        for (var p = 0; p < site_ids.length; p++) {
          if (!_self.is_pageview_fired(site_ids[p])) {
            pageviews_fired.push(site_ids[p]);
          }
        }
      };
      this.get_href = function (enc) {
        var href = clicky_custom.href || "";
        if (!href) {
          if (clicky_custom.iframe) {
            href = top.location.pathname + top.location.search;
            clicky_custom.title = top.document.title;
          }
          if (!href) href = location.pathname + location.search;
          if (location.hash.match(/utm_campaign/i)) {
            href = href + (location.search ? "&" : "?") + location.hash.substr(1);
          }
        }
        return enc ? _self.enc(href) : href;
      };
      this.log = function (href, title, type) {
        if (!href || _self.facebook_is_lame(href)) return;
        if (type == "pageview") href = href.replace(/^https?:\/\/([^\/]+)/i, "");
        _self.beacon({ type: type || "click", href: href, title: title || "" });
      };
      this.facebook_is_lame = function (href) {
        return href && href.match && href.match(/fb_xd_fragment|fb_xd_bust|fbc_channel/i);
      };
      this.heatmap_xy = function (e) {
        var x, y;
        if (e.pageX) {
          x = e.pageX;
          y = e.pageY;
        } else if (e.clientX) {
          x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
          y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        } else return;
        var w = _self.doc_wh(),
          href = _self.get_href();
        if (!clicky_custom.heatmap_disable)
          _self.beacon("heatmap", "&heatmap[]=" + _self.enc(href) + "|" + x + "|" + y + "|" + w.w);
      };
      this.doc_wh = function () {
        var db = document.body,
          de = document.documentElement;
        return {
          w: window.innerWidth || de.clientWidth || 1024,
          h: Math.max(
            db.scrollHeight,
            db.offsetHeight,
            de.clientHeight,
            de.scrollHeight,
            de.offsetHeight,
          ),
        };
      };
      this.heatmap = function (date, sub, subitem) {
        if (window._heatmap_destroy) _heatmap_destroy();
        if (window.heatmapFactory) _self.heatmap_data(date, sub, subitem);
        else {
          _self.inject("//static.getclicky.com/inc/javascript/heatmap.js");
          setTimeout(
            '_genericStats.heatmap("' +
              (date || "") +
              '","' +
              (sub || "") +
              '","' +
              (subitem || "") +
              '")',
            1000,
          );
        }
      };
      this.heatmap_data = function (date, sub, subitem) {
        wh = _self.doc_wh();
        _self.inject(
          "//clicky.com/ajax/onsitestats/heatmap?" +
            "site_id=" +
            site_ids[0] +
            _self.sitekey(site_ids[0]) +
            "&href=" +
            _self.get_href(1) +
            "&domain=" +
            location.hostname +
            "&w=" +
            wh.w +
            "&h=" +
            wh.h +
            (location.hash.match(/^#_heatmap/) ? location.hash.replace(/^#_heatmap/, "") : "") +
            (date ? "&date=" + date : "") +
            (sub ? "&sub=" + sub : "") +
            (subitem ? "&subitem=" + subitem : "") +
            "&x=" +
            Math.random(),
        );
      };
      this.heatmap_override = function (e) {
        if (document.querySelectorAll) {
          var nodes = document.querySelectorAll(e);
          for (var n = 0; n < nodes.length; n++) {
            _self.add_event(nodes[n], "click", _self.heatmap_xy);
          }
        }
      };
      this.onsitestats = function (refresh, reset) {
        if (ossassets) {
          if (window.jQuery && window._OSS) {
            if (_self.jqnc) {
              jQuery.noConflict();
              _self.jqnc = 0;
            }
            if (!ossdata || refresh) {
              ossdata = 1;
              _self.inject(
                "//clicky.com/ajax/onsitestats/?site_id=" +
                  site_ids[0] +
                  _self.sitekey(site_ids[0]) +
                  "&href=" +
                  _self.get_href(1) +
                  "&domain=" +
                  location.hostname +
                  (refresh ? "&refresh=1" : "") +
                  (reset ? "&reset=1" : "") +
                  "&x=" +
                  Math.random(),
              );
            }
          } else setTimeout(_self.onsitestats, 200);
        } else {
          ossassets = 1;
          _self.inject("//static.getclicky.com/inc/onsitestats.css", "css");
          _self.inject("//static.getclicky.com/inc/javascript/onsitestats.js");
          if (!window.jQuery) {
            _self.inject("//static.getclicky.com/inc/javascript/jquery.js");
            _self.jqnc = 1;
          }
          setTimeout(_self.onsitestats, 1000);
        }
      };
      this.start_monitors = function () {
        if (!monitors) {
          monitors = 1;
          _self.hm_monitor();
          if (
            !window._htmlvid &&
            clicky_custom.html_media_track &&
            (document.getElementsByTagName("audio").length ||
              document.getElementsByTagName("video").length)
          ) {
            _self.inject("//static.getclicky.com/inc/javascript/video/html.js");
          }
          if (!clicky_custom.history_disable && window.history && window.history.pushState) {
            _self.pushState = history.pushState;
            history.pushState = function () {
              _self.pushState.apply(history, arguments);
              setTimeout(_self.pageview, 250);
            };
            _self.add_event(window, "popstate", function (e) {
              if (e.state) setTimeout(_self.pageview, 250);
            });
          }
        }
      };
      this.hm_monitor = function () {
        if (document.body) {
          _self.add_event(document.body, "click", _self.heatmap_xy);
          if (clicky_custom.heatmap_objects) {
            if (typeof clicky_custom.heatmap_objects === "object") {
              for (var hmo in clicky_custom.heatmap_objects)
                _self.heatmap_override(clicky_custom.heatmap_objects[hmo]);
            } else {
              _self.heatmap_override(clicky_custom.heatmap_objects);
            }
          }
        } else setTimeout(_self.hm_monitor, 1000);
      };
      this.video = function (action, time, url, title) {
        if (!url || !action) return false;
        _self.beacon(
          "video",
          "&video[action]=" +
            action +
            "&video[time]=" +
            (time || 0) +
            "&href=" +
            _self.enc(url) +
            (title ? "&title=" + _self.enc(title) : ""),
        );
      };
      this.goal = function (id, revenue) {
        if (!id) return;
        var goal =
          typeof id == "number" || id.match(/^[0-9]+$/) ? "[id]=" + id : "[name]=" + _self.enc(id);
        _self.beacon({
          type: "goal",
          q: "&goal" + goal + (revenue ? "&goal[revenue]=" + revenue : ""),
        });
      };
      this.beacon = function (type, q, called_by_pageview) {
        if (typeof type == "object") {
          var o = type;
          if (o.type) type = o.type;
          else return false;
          if (o.q) {
            q = o.q;
          } else {
            var temp = "";
            for (var i in o) {
              if (i != "type" && o.hasOwnProperty && o.hasOwnProperty(i))
                temp += "&" + i + "=" + _self.enc(o[i]);
            }
            q = temp;
            delete temp;
          }
        } else {
          type = type || "pageview";
          q = q || "";
        }
        var custom = "",
          goal = "",
          split = "",
          jsuid = _self.get_cookie("_jsuid");
        if (!jsuid) {
          _self.set_cookie("_jsuid", _self.randy());
          jsuid = _self.get_cookie("_jsuid");
        }
        if (type != "heatmap" && type != "ping") {
          custom = _self.custom_data();
          if (clicky_custom.goal) {
            if (typeof clicky_custom.goal == "object") {
              for (var i in clicky_custom.goal) {
                if (clicky_custom.goal.hasOwnProperty && clicky_custom.goal.hasOwnProperty(i))
                  goal += "&goal[" + _self.enc(i) + "]=" + _self.enc(clicky_custom.goal[i]);
              }
            } else {
              goal = "&goal=" + _self.enc(clicky_custom.goal);
            }
            clicky_custom.goal = "";
          }
          if (clicky_custom.split) {
            for (var i in clicky_custom["split"]) {
              if (
                clicky_custom["split"].hasOwnProperty &&
                clicky_custom["split"].hasOwnProperty(i)
              ) {
                if (i == "goal" && typeof clicky_custom["split"].goal == "object") {
                  for (var j = 0, l = clicky_custom["split"].goal.length; j < l; j++) {
                    split += "&split[goal][]=" + clicky_custom.split.goal[j];
                  }
                } else split += "&split[" + _self.enc(i) + "]=" + _self.enc(clicky_custom.split[i]);
              }
            }
            clicky_custom.split = "";
          }
        }
        for (var site_id_index = 0; site_id_index < site_ids.length; site_id_index++) {
          var site_id = site_ids[site_id_index];
          if (_self.get_cookie("no_tracky_" + site_id)) continue;
          if (
            type != "pageview" &&
            (window["NO_PINGY_" + site_id] || _self.get_cookie("unpoco_" + site_id))
          )
            continue;
          if (type == "heatmap" && _self.get_cookie("heatmaps_g2g_" + site_id) != "yes") continue;
          if (called_by_pageview && type == "pageview" && _self.is_pageview_fired(site_id))
            continue;
          _self.inject(
            _self.domain +
              "/in.php?site_id=" +
              site_id +
              "&type=" +
              type +
              q +
              custom +
              goal +
              split +
              (jsuid ? "&jsuid=" + jsuid : "") +
              (_self.get_cookie("unpoco_" + site_id) ? "&upset" : "") +
              (_self.get_cookie("heatmaps_g2g_" + site_id) ? "&hmset" : "") +
              (clicky_custom.visitor_consent ? "&consent=1" : "") +
              "&mime=js&x=" +
              Math.random(),
            type == "pageview" ? "js" : "beacon",
          );
        }
        if (
          navigator.userAgent.match(/msie|trident/i) &&
          (type == "outbound" || type == "download")
        )
          _self.pause();
        _self.ref = "";
        _self.utm = "";
        _self.ping_start();
      };
      this.inject = function (src, type) {
        type = type || "js";
        if (type == "beacon") {
          if (window.navigator.sendBeacon && navigator.sendBeacon(src)) return;
          type = "js";
        }
        if (type == "js") {
          var s = document.createElement("script");
          s.type = "text/javascript";
          s.async = true;
          s.src = src;
        } else if (type == "css") {
          var s = document.createElement("link");
          s.type = "text/css";
          s.rel = "stylesheet";
          s.href = src;
        }
        (document.body || document.getElementsByTagName("head")[0]).appendChild(s);
      };
      this.is_pageview_fired = function (site_id) {
        for (var p = 0; p < pageviews_fired.length; p++)
          if (pageviews_fired[p] == site_id) return true;
        return false;
      };
      this.ping = function () {
        _self.beacon("ping");
      };
      this.ping_set = function () {
        var pingy = setInterval(_self.ping, 120000);
        setTimeout(function () {
          clearInterval(pingy);
        }, _self.ps_stop * 1000);
        _self.ping();
      };
      this.ping_start = function () {
        if (clicky_custom.ping_disable || _self.pinging) return;
        _self.pinging = 1;
        _self.ps_stop =
          clicky_custom.timeout && clicky_custom.timeout >= 5 && clicky_custom.timeout <= 240
            ? clicky_custom.timeout * 60 - 120 + 5
            : 485;
        setTimeout(_self.ping, 30000);
        setTimeout(_self.ping, 60000);
        setTimeout(_self.ping_set, 120000);
      };
      this.get_cookie = function (name) {
        if (clicky_custom.sticky_data_disable && name.match(/^_(custom|utm|referrer)/)) return "";
        var ca = document.cookie.split(";");
        for (var i = 0, l = ca.length; i < l; i++) {
          if (ca[i].match(new RegExp("\\b" + name + "=")))
            return decodeURIComponent(ca[i].split(name + "=")[1]);
        }
        return "";
      };
      this.set_cookie = function (name, value, expires, force) {
        if (
          (clicky_custom.cookies_disable && !force) ||
          (clicky_custom.sticky_data_disable && name.match(/^_(custom|utm|referrer)/))
        )
          return false;
        var temp =
          name + "=" + _self.enc(value) + ";max-age=" + (expires || 1 * 365 * 86400) + ";path=/;";
        if (clicky_custom.cookie_domain) {
          temp += "domain=" + clicky_custom.cookie_domain + ";";
        } else if (location.hostname.match(/\./))
          temp += "domain=." + location.hostname.replace(/^www\./i, "") + ";";
        document.cookie = temp;
      };
      this.randy = function () {
        var i = 0;
        do {
          var r = Math.round(Math.random() * 4294967295);
        } while (r == 1421816160 && i++ < 100);
        return r;
      };
      this.pause = function (x) {
        var now = new Date();
        var stop = now.getTime() + (x || clicky_custom.timer || window.clicky_pause_timer || 100);
        while (now.getTime() < stop) var now = new Date();
      };
      this.enc = function (e) {
        return window.encodeURIComponent ? encodeURIComponent(e) : escape(e);
      };
      this.add_event = function (o, type, func) {
        if (o.addEventListener) {
          o.addEventListener(type, func, false);
        } else if (o.attachEvent) {
          o.attachEvent("on" + type, func);
        }
      };
      this.download = function (e) {
        _self.adv_log(e, "download");
      };
      this.outbound = function (e) {
        _self.adv_log(e, "outbound");
      };
      this.click = function (e) {
        _self.adv_log(e, "click");
      };
      this.adv_log = function (e, type) {
        var obj = _self.get_target(e);
        _self.log(_self.adv_href(obj), _self.adv_text(obj), type);
      };
      this.adv_text = function (e) {
        do {
          var txt = e.text ? e.text : e.innerText;
          if (txt) return txt;
          if (e.alt) return e.alt;
          if (e.title) return e.title;
          if (e.src) return e.src;
          e = _self.get_parent(e);
        } while (e);
        return "";
      };
      this.adv_href = function (e) {
        do {
          if (e.href && !e.src) return e.href;
          e = _self.get_parent(e);
        } while (e);
        return "";
      };
      this.get_parent = function (e) {
        return e.parentElement || e.parentNode;
      };
      this.get_target = function (e) {
        if (!e) var e = window.event;
        var t = e.target ? e.target : e.srcElement;
        if (t.nodeType && t.nodeType == 3) t = t.parentNode;
        return t;
      };
      this.advanced = function () {
        var is_link = new RegExp("^(https?|ftp|telnet|mailto|tel):", "i");
        var is_link_internal = new RegExp(
          "^https?://(.*)" + location.host.replace(/^www\./i, ""),
          "i",
        );
        var is_download = new RegExp(
          "\\.(7z|aac|apk|avi|cab|csv|dmg|doc(x|m|b)?|epub|exe|flv|gif|gz|jpe?g|js|m4a|mp(3|4|e?g)|mobi|mov|msi|ods|pdf|phps|png|ppt(x|m|b)?|rar|rtf|sea|sit|svgz?|tar|torrent|txt|vcf|wma|wmv|xls(x|m|b)?|xml|zip)$",
          "i",
        );
        var a = document.getElementsByTagName("a");
        for (var i = 0; i < a.length; i++) {
          if (typeof a[i].className != "string") continue;
          if (a[i].className.match(/clicky_log/i)) {
            if (a[i].className.match(/clicky_log_download/i)) {
              _self.add_event(a[i], "mousedown", _self.download);
            } else if (a[i].className.match(/clicky_log_outbound/i)) {
              _self.add_event(a[i], "mousedown", _self.outbound);
            } else {
              _self.add_event(a[i], "mousedown", _self.click);
            }
          } else {
            if (
              clicky_custom.outbound_disable ||
              clicky_custom.advanced_disable ||
              window.clicky_advanced_disable
            )
              continue;
            if (is_link.test(a[i].href) && !a[i].className.match(/clicky_ignore/i)) {
              if (is_download.test(a[i].href)) {
                _self.add_event(a[i], "mousedown", _self.download);
              } else if (!is_link_internal.test(a[i].href)) {
                _self.add_event(a[i], "mousedown", _self.outbound);
              } else if (clicky_custom.outbound_pattern) {
                var p = clicky_custom.outbound_pattern;
                if (typeof p == "object") {
                  for (var j = 0; j < p.length; j++) {
                    if (_self.outbound_pattern_match(a[i].href, p[j])) {
                      _self.add_event(a[i], "mousedown", _self.outbound);
                      break;
                    }
                  }
                } else if (typeof p == "string") {
                  if (_self.outbound_pattern_match(a[i].href, p))
                    _self.add_event(a[i], "mousedown", _self.outbound);
                }
              }
            }
          }
        }
      };
      this.outbound_pattern_match = function (href, pattern) {
        return RegExp(pattern.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")).test(href);
      };
    }
    return new (function () {
      this.getInstance = function () {
        if (instance == null) {
          instance = new _ins();
          instance.constructor = null;
        }
        return instance;
      };
    })();
  })();
var clicky = clicky_obj.getInstance();
if (!window.clicky_custom) var clicky_custom = {};
if (clicky_custom.iframe && self == top) clicky_custom.iframe = 0;
if (window.clicky_goal) clicky_custom.goal = clicky_goal;
if (window.clicky_custom_session) clicky_custom.session = clicky_custom_session;
if (clicky_custom.session) clicky_custom.visitor = clicky_custom.session;
if (clicky_custom.no_cookies) clicky_custom.cookies_disable = 1;
var clicky_site_ids = clicky_site_ids || [];
if (window.async_site_id) clicky_site_ids.push(async_site_id);
if (window.clicky_site_id) clicky_site_ids.push(clicky_site_id);
while (clicky_site_ids.length) clicky.init(clicky_site_ids.shift());
var _genericStats = clicky,
  _genericStatsCustom = clicky_custom;
