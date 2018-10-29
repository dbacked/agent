# Uninstall

To delete DBacked from your server, you need to disable the SystemD service with the command `sudo systemctl disable dbacked.service --now`. Then you can delete the service file with `sudo rm /lib/systemd/system/dbacked.service`.

Finally, you can delete the binary executable file with `sudo rm /usr/local/bin/dbacked`.

This process will be soon automated.
