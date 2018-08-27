# Getting started

There is multiple ways to install the DBacked agent depending on your platform and how much control you want over the installation.

## Interactive installation

DBacked includes an interactive installer that will ask you everything it needs to start backing up your database. To start the installer, download the binary and use the `install-agent` command:

```bash
wget https://dl.dbacked.com/dbacked -O ./dbacked
chmod +x ./dbacked
sudo ./dbacked install-agent
```

This will create the `/etc/dbacked/config.json` file populated with the responses you provided and copy the binary to `/usr/local/bin/dbacked`. This is why running as the superuser is required. Of course, you don't need to execute the agent as a superuser afterwards.

If you are using a linux distribution which boot SystemD (like Ubuntu, Debian, Fedora or ArchLinux), the install process will detect it and create a service to start DBacked at startup.

If you're not using SystemD, you'll need to configure your server to start DBacked at boot. There's multiple way to do it depending on your configuration but you'll need to make sure that `/usr/local/bin/dbacked start-agent` is launched.

<div id="asciinema_container"></div>

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
    container.style.margin = '20px 0';

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

## Docker

If your infrastructure is running with Docker, I packaged the binary in a container for you. The container image is hosted on Docker Hub: [dbacked/agent](https://hub.docker.com/r/geekuillaume/dbacked/).

You can run it from the command line with `docker run geekuillaume/dbacked dbacked start-agent` but by default it will do nothing as you need to configure it. You can use environment variables, command line arguments or a configuration file to do so. For more information, look at the [configuration documentation](./configuration.html).

Don't forget that if you are running your database in a Docker container, you need to link the DBacked container to it. This will allow DBacked to reach your database. To do so, use the [`depends_on`](https://docs.docker.com/compose/compose-file/#depends_on) configuration with Docker Compose or the [`--link`](https://docs.docker.com/engine/reference/commandline/run/) argument with the Docker CLI.

<!--  TODO: Change docker name to dbacked/agent -->

## Manual compilation and installation

If you want to be sure of what you're installing on your servers, you can manually compile and install the binary.

DBacked is a NodeJS program so you'll need NodeJS on your machine to build it (tested on v10.1.0). First, install the dependencies with `npm install`, compile the Typescript sources with `npm run build:ts` and finaly package it in a binary with `npm run build:bin`. It will then be saved as `dbacked` in your current working directory.

To launch it, you need to use the `dbacked start-agent` command. This will launch the long-lived process that will watch the database and launch a backup when needed. You can also use the `--daemon` argument to launch it as a daemon and detach it from your current session. Make sure the agent is started at boot.

Without the interactive install, you'll need to configure it manually. For more information, look at the [configuration documentation](./configuration.html).

