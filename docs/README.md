---
home: true
heroImage: /icon.svg
actionText: Get Started →
actionLink: /guide/
features:
- title: Security first
  details: All the backups are encrypted before upload so that only you can decrypt them. The files are tested before sending and the uploaded file integrity is checked.
- title: Working in 60 seconds
  details: One line to copy-paste in your terminal to start the interactive install process. No configuration editing needed, everything is asked and tested live.
- title: Backup but also restore
  details: One command to start the interactive restore process, choose your backup from the list and let DBacked stream it back to your database.
footer: GNU Licensed | Copyright © 2018-present Guillaume Besson
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