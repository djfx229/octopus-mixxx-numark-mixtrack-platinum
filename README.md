
# Добавить файлы маппинга в Mixxx

Через символические ссылки (в директории пользователя, при условии что репозиторий склонирован в 
\dev\octopusss-numark-mixtrack-platinum).

```shell
mklink /H "\AppData\Local\Mixxx\controllers\Octopus Numark Mixtrack Platinum.midi.xml" "\dev\octopusss-numark-mixtrack-platinum\Octopus Numark Mixtrack Platinum.midi.xml" 
```

```shell
mklink /H "\AppData\Local\Mixxx\controllers\Octopus-Numark-Mixtrack-Platinum-scripts.js" "\dev\octopusss-numark-mixtrack-platinum\Octopus-Numark-Mixtrack-Platinum-scripts.js" 
```

```shell
mklink /H "\AppData\Local\Mixxx\controllers\octopus.js" "\dev\octopusss-numark-mixtrack-platinum\octopus.js" 
```
