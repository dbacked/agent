---
home: true
heroImage: /icon.svg
actionText: Install guide →
actionLink: /guide/
features:
- title: Security first
  details: All the backups are encrypted before upload so that only you can decrypt them. The files are tested before sending and the uploaded file integrity is checked.
- title: Working in 60 seconds
  details: One line to copy-paste in your terminal to start the interactive install process. No configuration editing needed, everything is asked and tested live.
- title: Backup but also restore
  details: One command to start the interactive restore process, choose your backup from the list and let DBacked stream it back to your database.
footer: GNU AGPLv3
---

## Works with

<div class="columns compatible-with-logos-container">
  <div class="compatible-with-logo-container">
    <img src="./media/mysql.svg" class="compatible-with-logo vertical-logo">
    <p>MySQL</p>
  </div>
  <div class="compatible-with-logo-container">
    <img src="./media/postgresql.svg" class="compatible-with-logo vertical-logo">
    <p>PostgreSQL</p>
  </div>
  <div class="compatible-with-logo-container">
    <img src="./media/mongodb.svg" class="compatible-with-logo vertical-logo">
    <p>MongoDB</p>
  </div>
</div>


# Start now!

```bash
wget https://dl.dbacked.com/dbacked -O ./dbacked
chmod +x ./dbacked
sudo ./dbacked install-agent
```

<script>
  export default {
    mounted () {
      // asciinema embedded player

(function() {
  function insertAfter(referenceNode, newNode) {
    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
  }

  function params(container, script) {
    function format(name) {
      var value = script.getAttribute('data-' + name);
      if (value) {
        return name + '=' + value;
      }
    }

    var options = ['size', 'speed', 'autoplay', 'loop', 'theme', 't', 'preload', 'cols', 'rows'];

    return '?' + options.map(format).filter(Boolean).join('&');
  }

  function insertPlayer(script) {
    // do not insert player if there's one already associated with this script
    if (script.dataset.player) {
      return;
    }

    var apiHost = 'https://asciinema.org';

    var asciicastId = script.id.split('-')[1];

    var container = document.createElement('div');
    container.id = "asciicast-container-" + asciicastId;
    container.className = 'asciicast';
    container.style.display = 'block';
    container.style.float = 'none';
    container.style.overflow = 'hidden';
    container.style.padding = 0;
    container.style.margin = '20px auto';

    insertAfter(script, container);

    var iframe = document.createElement('iframe');
    iframe.src = apiHost + "/a/" + asciicastId + '/embed' + params(container, script);
    iframe.id = "asciicast-iframe-" + asciicastId;
    iframe.name = "asciicast-iframe-" + asciicastId;
    iframe.scrolling = "no";
    iframe.setAttribute('allowFullScreen', 'true');
    iframe.style.overflow = "hidden";
    iframe.style.margin = 0;
    iframe.style.border = 0;
    iframe.style.display = "inline-block";
    iframe.style.width = "100%";
    iframe.style.float = "none";
    iframe.style.visibility = "hidden";
    iframe.onload = function() { this.style.visibility = 'visible' };

    container.appendChild(iframe);

    function receiveSize(e) {
      if (e.origin === apiHost) {
        var name = e.data[0];
        var data  = e.data[1];
        var iframeWindow = iframe.contentWindow || iframe;

        if (e.source == iframeWindow && name == 'asciicast:size') {
          iframe.style.width  = '' + data.width + 'px';
          iframe.style.height = '' + data.height + 'px';
          container.style.width  = '' + data.width + 'px';
          container.style.height = '' + data.height + 'px';
        }
      }
    }

    window.addEventListener("message", receiveSize, false);

    script.dataset.player = container;
  }

  var scripts = document.querySelectorAll("div[id^='asciicast-']");
  [].forEach.call(scripts, insertPlayer);
})();
    }
  }
</script>

<div id="asciicast-CEMkb0yQituoE21tz3KDohyH3"></div>


<style>
.compatible-with-logos-container {
  display: flex;
  justify-content: space-between;
  width: 500px;
  max-width: 100%;
  margin: auto;
}
.compatible-with-logo-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 10px 10px;
  width: 100px;
  transform: translate3d(0,0,0);
  transition: 0.5s all ease;
}
.compatible-with-logo-container:hover {
  transform: translate3d(0,-5px,0);
}

.compatible-with-logo {
  flex: 1;
  max-height: 60px;
  margin: 10px 0;
}
.vertical-logo {
  max-height: 80px;
}

.compatible-with-logo-container p {
  margin: 15px 0 0 0;
}
</style>