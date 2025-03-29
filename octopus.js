/**
 * Octopus - набор классов упрощающих реализацию различных слоёв для пэдов в рамках маппинга Mixxx.
 */

(function(global) {
    class Output {
      constructor(deck) {
        this.deck = deck;
      }

      led(numberPad, isEnable) {
          console.log("Output: led numberPad=" + numberPad + " , isEnable=" + isEnable + " ");
      }
    }

    class Layer {
      constructor(deck) {
        this.deck = deck;
        this.output = new Output(deck);
        this.pressedShift = false;
      }

      pad(numberPad, isPressed) {
          console.log("Layer: pressed pad " + numberPad);
      }

      shift(isPressed) {
          this.pressedShift = isPressed;
      }
    }

    class BeatJumpLayer extends Layer {
        constructor (deck) {
            super(deck);
        }

        pad(numberPad, isPressed) {
          console.log("BeatJumpLayer: pressed pad " + numberPad);
        }

        shift(isPressed) {
            super.shift(isPressed);
            this.output.led(1, false);
        }
    }

    class HotCuesLayer extends Layer {
        constructor (deck) {
            super(deck);
        }

        pad(numberPad, isPressed) {
          console.log("HotCuesLayer: pressed pad " + numberPad);
          this.output.led(numberPad, true);
        }
    }

    class SwitchLayersLayer extends Layer {
        constructor (options) {
            super(options.deck);
            this.callback = options.callback;

            this.hotcuesLayer = new HotCuesLayer(this.deck);
            this.beatjumpsLayer = new BeatJumpLayer(this.deck);
            this.currentLayerNum = 1;
        }

        currentLayer() {
        //   console.log("SwitchLayersLayer: currentLayer() " + this.currentLayerNum);
          switch (this.currentLayerNum) {
            // case 1: - default
            case 2:
            //   console.log("SwitchLayersLayer: currentLayer() beatjumpsLayer " + this.beatjumpsLayer);
              return this.beatjumpsLayer;
            default:
                //   console.log("SwitchLayersLayer: currentLayer() hotcuesLayer " + this.hotcuesLayer);
                return this.hotcuesLayer;
          }
        }

        pad(numberPad, isPressed) {
            console.log("SwitchLayersLayer: pressed pad " + numberPad);
            if (isPressed) {
                this.currentLayerNum = numberPad;
                this.callback(this.currentLayer());
            }
        }
    }

    class Input {
      constructor(deck) {
        this.deck = deck;
        this.output = new Output(deck);
        this.isSwitchLayerState = false;
        this.switchLayersLayer = new SwitchLayersLayer({
            deck: this.deck,
            callback: function(layer) {
                console.log("Input: callback change layer to " + layer);
            },
        });
      }

      switchLayerButton(value) {
        this.isSwitchLayerState = value > 0;
      };

      shift (channel, control, value, status, group) {
          this.pressedShift = value > 0;
          this.switchLayersLayer.currentLayer().shift(this.pressedShift);
        }


        pad(numPad, value) {
            console.log("Input: pressed pad " + numPad);
            console.log("Input: current layer " + this.switchLayersLayer.currentLayer());

            const isPressed = value > 0;
          if (this.isSwitchLayerState) {
            this.switchLayersLayer.pad(numPad, isPressed);
            this.switchLayersLayer.currentLayer().output = this.output;
          } else {
            this.switchLayersLayer.currentLayer().pad(numPad, isPressed);
          }
        }

        /*
        Вообще я хотел создать массив pads, и через цикл задать коллбеки с нужными индексами
        Чтобы такой копипаст не писать, но столкнулся с тем, что внутри функции, которая присвоена как
        элемент массива, нельзя вызывать функцию из класса, при том что просто из конструктора я спокойно
        могу обращаться к таким функциям.
        */

        pad1(channel, control, value, status, group) {
            this.pad(1, channel, control, value, status, group);
        }

        pad2(channel, control, value, status, group) {
            this.pad(2, channel, control, value, status, group);
        }
    }

    // Экспортируем классы в глобальный объект
    const exports = {};
    exports.Input = Input;
    exports.Output = Output;
    // private exports.Layer = Layer;
    // private exports.SwitchLayersLayer = SwitchLayersLayer;
    exports.BeatJumpLayer = BeatJumpLayer;
    exports.HotCuesLayer = HotCuesLayer;

    global.octopus = exports;
}(this));
