# Restore a backup

DBacked doesn't stop at backing up your database, it also takes care of the restore process. It's necessary because the backups created are not plug-and-play with `pg_restore`, `mysqlrestore` or `mongorestore` ([Here's why](implementation-details.html#backup-process)).

The easiest way is to use the `dbacked restore` command. It will use the current config file ([see configuration page](configuration.html)) and fetch the list of available backups from S3 for DBacked Free and DBacked API for the pro version.

You need to specify the private key with the `--private-key-path` argument or the environment variable `DBACKED_PRIVATE_KEY`.

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

<div id="asciicast-3JiHpWmaYpRfT3lKddIAFa0xI"></div>

## Restore specific flags

DBacked includes multiple restore specific flags to allow you to automate the restore process:

- `--last-backup`: doesn't ask you to choose the backup, uses the last one
- `--private-key-path`: RSA PEM formatted private key to use to decrypt the backup, can be password protected
- `--force`: Do not ask for confirmation before restore
- `--raw-input`: Do not download backup from S3, read from stdin (you need to pipe with something like this `cat backup | dbacked restore --raw-input`)
- `--raw-output`: Do not pipe in database restore process but output decrypted backup without any DBacked specific formating
- `-y`: Do not ask for questions during process, only use env variables and arguments
