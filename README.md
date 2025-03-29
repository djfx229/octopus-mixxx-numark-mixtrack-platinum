
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

# Настройка LSP

Для корректной работы подсветки синтакциса, необходимо создать `jsconfig.json`.
К сожалению, сейчас `midi-components-0.0.js` не имеет `d.ts` файла, поэтому на его компоненты Ide продолжает ругаться и после настройки LSP. 
Подробнее https://mixxx.org/news/2024-08-18-controller-api-declartions/
В сам проект данный json не включаю, так как мой путь установки Mixxx отличается от стандартного.

```
{
"compilerOptions": {
    "target": "es6",
    "checkJs": true,
    "lib": [ "ES2016" ]
},
"include": [
    "./Octopus-Numark-Mixtrack-Platinum-scripts.js",
    "./octopus.js",
    "C:/Program Files/Mixxx/controllers/common-controller-scripts.js",
    "C:/Program Files/Mixxx/controllers/engine-api.d.ts",
    "C:/Program Files/Mixxx/controllers/color-mapper-api.d.ts",
    "C:/Program Files/Mixxx/controllers/console-api.d.ts",
    "C:/Program Files/Mixxx/controllers/midi-controller-api.d.ts"
]
}
```