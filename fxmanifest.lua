fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'v0-characters'
author 'V0 Dev'
version '1.0.0'
description 'Premium character selection & creator for QBCore (V0)'

ui_page 'ui/dist/index.html'

files {
    'ui/dist/index.html',
    'ui/dist/assets/*',
    'ui/dist/assets/**/*'
}

shared_scripts {
    'config.lua'
}

client_scripts {
    'client/main.lua',
    'client/creator.lua'
}

server_scripts {
    '@oxmysql/lib/MySQL.lua',
    'server/main.lua'
}

dependencies {
    'qb-core',
    'oxmysql'
}
