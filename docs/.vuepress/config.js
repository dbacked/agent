module.exports = {
  title: 'DBacked',
  description: 'The best way to backup and restore your database',
  base: '/agent/',
  themeConfig: {
    lastUpdated: 'Last Updated',
    displayAllHeaders: true,
    sidebar: {
      '/guide/': [{
        title: 'Guide',
        collapsable: false,
        sidebarDepth: 4,
        children: [
          '',
          'getting-started',
          'restore',
          'configuration',
          's3-configuration',
          'security',
          'implementation-details',
          'pro'
        ]
      }]
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'Github', link: 'https://github.com/dbacked/agent' },
    ]
  }
}
