////////////////////////////////////////////////////////////////////////
// JSHint configuration                                               //
////////////////////////////////////////////////////////////////////////
/* global engine                                                      */
/* global script                                                      */
/* global print                                                       */
/* global midi                                                        */
////////////////////////////////////////////////////////////////////////

/******************
 * CONFIG OPTIONS *
 ******************/

// should wheel be enabled on startup?
var EnableWheel = true;

// should shift+load eject or load and play?
var ShiftLoadEjects = false;

// should we show effect parameters when an effect is focused?
var ShowFocusedEffectParameters = false;

var MixtrackPlatinum = {};

MixtrackPlatinum.init = function (id, debug) {
    MixtrackPlatinum.id = id;
    MixtrackPlatinum.debug = debug;
    
    const padMapper = new NumarkPlatinumPadMapper();

    MixtrackPlatinum.octopusInputs = new octopus.GroupedInputs({
        groupsArray: padMapper.groups,
        output: MixtrackPlatinum.octopusOutput,
        midiToPad: padMapper.midiToPad.bind(padMapper),
        requestPadAddress: padMapper.requestPadAddress.bind(padMapper),
    });

    // effects
    MixtrackPlatinum.effects = new components.ComponentContainer();
    MixtrackPlatinum.effects[1] = new MixtrackPlatinum.EffectUnit([1, 3]);
    MixtrackPlatinum.effects[2] = new MixtrackPlatinum.EffectUnit([2, 4]);

    // decks
    MixtrackPlatinum.decks = new components.ComponentContainer();
    MixtrackPlatinum.decks[1] = new MixtrackPlatinum.Deck(1, 0x00, MixtrackPlatinum.effects[1]);
    MixtrackPlatinum.decks[2] = new MixtrackPlatinum.Deck(2, 0x01, MixtrackPlatinum.effects[2]);
    MixtrackPlatinum.decks[3] = new MixtrackPlatinum.Deck(3, 0x02, MixtrackPlatinum.effects[1]);
    MixtrackPlatinum.decks[4] = new MixtrackPlatinum.Deck(4, 0x03, MixtrackPlatinum.effects[2]);

    // headphone gain
    MixtrackPlatinum.head_gain = new components.Pot({
        group: '[Master]',
        inKey: 'headGain',
    });

    // exit demo mode
    var byteArray = [0xF0, 0x00, 0x01, 0x3F, 0x7F, 0x3A, 0x60, 0x00, 0x04, 0x04, 0x01, 0x00, 0x00, 0xF7];
    midi.sendSysexMsg(byteArray, byteArray.length);

    // initialize some leds
    MixtrackPlatinum.effects.forEachComponent(function (component) {
        component.trigger();
    });
    MixtrackPlatinum.decks.forEachComponent(function (component) {
        component.trigger();
    });

    MixtrackPlatinum.browse = new MixtrackPlatinum.BrowseKnob();

    // helper functions
    var led = function(group, key, midi_channel, midino) {
        if (engine.getValue(group, key)) {
            midi.sendShortMsg(0x90 | midi_channel, midino, 0x7F);
        }
        else {
            midi.sendShortMsg(0x80 | midi_channel, midino, 0x00);
        }
    };

    // init a bunch of channel specific leds
    for (var i = 0; i < 4; ++i) {
        var group = "[Channel"+(i+1)+"]";

        // keylock indicator
        led(group, 'keylock', i, 0x0D);

        // turn off bpm arrows
        midi.sendShortMsg(0x80 | i, 0x0A, 0x00); // down arrow off
        midi.sendShortMsg(0x80 | i, 0x09, 0x00); // up arrow off

        // slip indicator
        led(group, 'slip_enabled', i, 0x0F);

        // initialize wheel mode (and leds)
        MixtrackPlatinum.wheel[i] = EnableWheel;
        midi.sendShortMsg(0x90 | i, 0x07, EnableWheel ? 0x7F : 0x01);
    }

    // zero vu meters
    midi.sendShortMsg(0xBF, 0x44, 0);
    midi.sendShortMsg(0xBF, 0x45, 0);

    // setup elapsed/remaining tracking
    engine.makeConnection("[Controls]", "ShowDurationRemaining", MixtrackPlatinum.timeElapsedCallback);

    // setup vumeter tracking
    engine.makeUnbufferedConnection("[Channel1]", "vu_meter", MixtrackPlatinum.vuCallback);
    engine.makeUnbufferedConnection("[Channel2]", "vu_meter", MixtrackPlatinum.vuCallback);
    engine.makeUnbufferedConnection("[Channel3]", "vu_meter", MixtrackPlatinum.vuCallback);
    engine.makeUnbufferedConnection("[Channel4]", "vu_meter", MixtrackPlatinum.vuCallback);
    engine.makeUnbufferedConnection("[Main]", "vu_meter_left", MixtrackPlatinum.vuCallback);
    engine.makeUnbufferedConnection("[Main]", "vu_meter_right", MixtrackPlatinum.vuCallback);
};

MixtrackPlatinum.shutdown = function() {
    // note: not all of this appears to be strictly necessary, things work fine
    // with out this, but Serato has been observed sending these led reset
    // messages during shutdown. The last sysex message may be necessary to
    // re-enable demo mode.

    // turn off a bunch of channel specific leds
    for (var i = 0; i < 4; ++i) {
        // pfl/cue button leds
        midi.sendShortMsg(0x90 | i, 0x1B, 0x01);

        // loop leds
        midi.sendShortMsg(0x80 | i + 5, 0x32, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x33, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x34, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x35, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x38, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x39, 0x00);

        // play leds
        midi.sendShortMsg(0x90 | i, 0x00, 0x01);
        midi.sendShortMsg(0x90 | i, 0x04, 0x01);

        // sync leds
        midi.sendShortMsg(0x90 | i, 0x00, 0x02);
        midi.sendShortMsg(0x90 | i, 0x04, 0x03);

        // cue leds
        midi.sendShortMsg(0x90 | i, 0x00, 0x01);
        midi.sendShortMsg(0x90 | i, 0x04, 0x05);

        // hotcue leds
        midi.sendShortMsg(0x80 | i + 5, 0x18, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x19, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x1A, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x1B, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x20, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x21, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x22, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x23, 0x00);

        // auto-loop leds
        midi.sendShortMsg(0x80 | i + 5, 0x14, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x15, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x16, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x17, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x1C, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x1D, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x1E, 0x00);
        midi.sendShortMsg(0x80 | i + 5, 0x1F, 0x00);

        // update spinner and position indicator
        midi.sendShortMsg(0xB0 | i, 0x3F, 0);
        midi.sendShortMsg(0xB0 | i, 0x06, 0);

        // keylock indicator
        midi.sendShortMsg(0x80 | i, 0x0D, 0x00);

        // turn off bpm arrows
        midi.sendShortMsg(0x80 | i, 0x0A, 0x00); // down arrow off
        midi.sendShortMsg(0x80 | i, 0x09, 0x00); // up arrow off

        // turn off slip indicator
        midi.sendShortMsg(0x80 | i, 0x0F, 0x00);

        // turn off wheel button leds
        midi.sendShortMsg(0x80 | i, 0x07, 0x00);
    }

    // dim FX leds
    midi.sendShortMsg(0x98, 0x00, 0x01);
    midi.sendShortMsg(0x98, 0x01, 0x01);
    midi.sendShortMsg(0x98, 0x02, 0x01);
    midi.sendShortMsg(0x99, 0x00, 0x01);
    midi.sendShortMsg(0x99, 0x01, 0x01);
    midi.sendShortMsg(0x99, 0x02, 0x01);

    // zero vu meters
    midi.sendShortMsg(0xBF, 0x44, 0);
    midi.sendShortMsg(0xBF, 0x45, 0);

    // send final shutdown message
    var byteArray = [0xF0, 0x00, 0x20, 0x7F, 0x02, 0xF7];
    midi.sendSysexMsg(byteArray, byteArray.length);
};

MixtrackPlatinum.EffectUnit = function (unitNumbers) {
    var eu = this;
    this.unitNumbers = unitNumbers;

    this.setCurrentUnit = function (newNumber) {
        this.currentUnitNumber = newNumber;
        this.group = '[EffectRack1_EffectUnit' + newNumber + ']';
        this.reconnectComponents(function (component) {
            // update [EffectRack1_EffectUnitX] groups
            var unitMatch = component.group.match(script.effectUnitRegEx);
            if (unitMatch !== null) {
                component.group = eu.group;
            } else {
                // update [EffectRack1_EffectUnitX_EffectY] groups
                var effectMatch = component.group.match(script.individualEffectRegEx);
                if (effectMatch !== null) {
                    component.group = '[EffectRack1_EffectUnit' +
                                      eu.currentUnitNumber +
                                      '_Effect' + effectMatch[2] + ']';
                }
            }
        });
    };

    this.setCurrentUnit(unitNumbers[0]);

    this.dryWetKnob = new components.Encoder({
        group: this.group,
        inKey: 'mix',
        input: function (channel, control, value, status, group) {
            if (value === 1) {
                this.inSetParameter(this.inGetParameter() + 0.05);
            } else if (value === 127) {
                this.inSetParameter(this.inGetParameter() - 0.05);
            }
        },
    });

    this.EffectUnitTouchStrip = function() {
        components.Pot.call(this);
        this.firstValueRecived = true;
        this.connect();
    };
    this.EffectUnitTouchStrip.prototype = new components.Pot({
        relative: true, // this disables soft takeover
        input: function (channel, control, value, status, group) {
            // never do soft takeover when the touchstrip is used
            engine.softTakeover(this.group, this.inKey, false);
            components.Pot.prototype.input.call(this, channel, control, value, status, group);
        },
        connect: function() {
            this.focus_connection = engine.makeConnection(eu.group, "focused_effect", this.onFocusChange.bind(this));
            this.focus_connection.trigger();
        },
        disconnect: function() {
            this.focus_connection.disconnect();
        },
        onFocusChange: function(value, group, control) {
            if (value === 0) {
                this.group = eu.group;
                this.inKey = 'super1';
            }
            else {
                this.group = '[EffectRack1_EffectUnit' + eu.currentUnitNumber + '_Effect' + value + ']';
                this.inKey = 'meta';
            }
        },
    });

    this.BpmTapButton = function () {
        this.group = '[Channel' + eu.currentUnitNumber + ']';
        this.midi = [0x97 + eu.currentUnitNumber, 0x04];
        components.Button.call(this);
    };
    this.BpmTapButton.prototype = new components.Button({
        type: components.Button.prototype.types.push,
        key: 'bpm_tap',
        off: 0x01,
        connect: function () {
            this.group = '[Channel' + eu.currentUnitNumber + ']';
            components.Button.prototype.connect.call(this);
        },
        input: function (channel, control, value, status, group) {
            components.Button.prototype.input.call(this, channel, control, value, status, group);
            if (this.isPress(channel, control, value, status)) {
                eu.forEachComponent(function (component) {
                    if (component.tap !== undefined && typeof component.tap === 'function') {
                        component.tap();
                    }
                });
            }
            else {
                eu.forEachComponent(function (component) {
                    if (component.untap !== undefined) {
                        component.untap();
                    }
                });
            }
        },
    });

    this.EffectEnableButton = function (number) {
        this.number = number;
        this.group = '[EffectRack1_EffectUnit' + eu.currentUnitNumber +
                      '_Effect' + this.number + ']';
        this.midi = [0x97 + eu.currentUnitNumber, this.number - 1];
        this.flash_timer = null;

        components.Button.call(this);
    };
    this.EffectEnableButton.prototype = new components.Button({
        type: components.Button.prototype.types.powerWindow,
        outKey: 'enabled',
        inKey: 'enabled',
        off: 0x01,
        tap: function() {
            this.inKey = 'enabled';
            this.type = components.Button.prototype.types.toggle;
            this.inToggle = this.toggle_focused_effect;
        },
        untap: function() {
            this.type = components.Button.prototype.types.powerWindow;
            this.inToggle = components.Button.prototype.inToggle;
        },
        shift:  function() {
            this.inKey = 'next_effect';
            this.type = components.Button.prototype.types.push;
        },
        unshift: function() {
            this.inKey = 'enabled';
            this.type = components.Button.prototype.types.powerWindow;
        },
        output: function(value, group, control) {
            var focused_effect = engine.getValue(eu.group, "focused_effect");
            if (focused_effect !== this.number) {
                engine.stopTimer(this.flash_timer);
                this.flash_timer = null;
                components.Button.prototype.output.call(this, value, group, control);
            }
            else {
                this.startFlash();
            }
        },
        toggle_focused_effect: function() {
            if (engine.getValue(eu.group, "focused_effect") === this.number) {
                engine.setValue(eu.group, "focused_effect", 0);
            }
            else {
                engine.setValue(eu.group, "focused_effect", this.number);
            }
        },
        connect: function() {
            components.Button.prototype.connect.call(this);
            this.fx_connection = engine.makeConnection(eu.group, "focused_effect", this.onFocusChange.bind(this));
        },
        disconnect: function() {
            components.Button.prototype.disconnect.call(this);
            this.fx_connection.disconnect();
        },
        onFocusChange: function(value, group, control) {
            if (value === this.number) {
                this.startFlash();
            }
            else {
                this.stopFlash();
            }
        },
        startFlash: function() {
            // already flashing
            if (this.flash_timer) {
                engine.stopTimer(this.flash_timer);
            }

            this.flash_state = false;
            this.send(this.on);

            var time = 500;
            if (this.inGetValue() > 0) {
                time = 150;
            }

            var button = this;
            this.flash_timer = engine.beginTimer(time, () => {
                if (button.flash_state) {
                    button.send(button.on);
                    button.flash_state = false;
                }
                else {
                    button.send(button.off);
                    button.flash_state = true;
                }
            });
        },
        stopFlash: function() {
            engine.stopTimer(this.flash_timer);
            this.flash_timer = null;
            this.trigger();
        },
    });

    this.show_focus_connection = engine.makeConnection(eu.group, "focused_effect", function(focused_effect, group, control) {
        if (focused_effect === 0) {
            engine.setValue(eu.group, "show_focus", 0);
            if (ShowFocusedEffectParameters) {
                engine.setValue(eu.group, "show_parameters", 0);
            }
        } else {
            engine.setValue(eu.group, "show_focus", 1);
            if (ShowFocusedEffectParameters) {
                engine.setValue(eu.group, "show_parameters", 1);
            }
        }
    }.bind(this));
    this.show_focus_connection.trigger();

    this.touch_strip = new this.EffectUnitTouchStrip();
    this.enableButtons = new components.ComponentContainer();
    for (var n = 1; n <= 3; n++) {
        this.enableButtons[n] = new this.EffectEnableButton(n);
    }

    this.bpmTap = new this.BpmTapButton();

    this.enableButtons.reconnectComponents();

    this.forEachComponent(function (component) {
        if (component.group === undefined) {
            component.group = eu.group;
        }
    });
};
MixtrackPlatinum.EffectUnit.prototype = new components.ComponentContainer();

MixtrackPlatinum.Deck = function(number, midi_chan, effects_unit) {
    var deck = this;
    var eu = effects_unit;
    this.active = (number == 1 || number == 2);

    components.Deck.call(this, number);

    this.bpm = new components.Component({
        outKey: "bpm",
        output: function(value, group, control) {
            MixtrackPlatinum.sendScreenBpmMidi(number, Math.round(value * 100));
        },
    });

    this.duration = new components.Component({
        outKey: "duration",
        output: function(duration, group, control) {
            // update duration
            MixtrackPlatinum.sendScreenDurationMidi(number, duration * 1000);

            // when the duration changes, we need to update the play position
            deck.position.trigger();
        },
    });

    this.position = new components.Component({
        outKey: "playposition",
        output: function(playposition, group, control) {
            // the controller appears to expect a value in the range of 0-52
            // representing the position of the track. Here we send a message to the
            // controller to update the position display with our current position.
            var pos = Math.round(playposition * 52);
            if (pos < 0) {
                pos = 0;
            }
            midi.sendShortMsg(0xB0 | midi_chan, 0x3F, pos);

            // get the current duration
            duration = deck.duration.outGetValue();

            // update the time display
            var time = MixtrackPlatinum.timeMs(number, playposition, duration);
            MixtrackPlatinum.sendScreenTimeMidi(number, time);

            // update the spinner (range 64-115, 52 values)
            //
            // the visual spinner in the mixxx interface takes 1.8 seconds to loop
            // (60 seconds/min divided by 33 1/3 revolutions per min)
            var period = 60 / (33+1/3);
            var midiResolution = 52; // the controller expects a value range of 64-115
            var timeElapsed = duration * playposition;
            var spinner = Math.round(timeElapsed % period * (midiResolution / period));
            if (spinner < 0) {
                spinner += 115;
            } else {
                spinner += 64;
            }

            midi.sendShortMsg(0xB0 | midi_chan, 0x06, spinner);
        },
    });

    this.play_button = new components.PlayButton({
        midi: [0x90 + midi_chan, 0x00],
        off: 0x01,
        sendShifted: true,
        shiftControl: true,
        shiftOffset: 4,
        unshift: function() {
            components.PlayButton.prototype.unshift.call(this);
            this.type = components.Button.prototype.types.toggle;
        },
        shift: function() {
            this.inKey = 'play_stutter';
            this.type = components.Button.prototype.types.push;
        },
    });

    this.load = new components.Button({
        inKey: 'LoadSelectedTrack',
        shift: function() {
            if (ShiftLoadEjects) {
                this.inKey = 'eject';
            }
            else {
                this.inKey = 'LoadSelectedTrackAndPlay';
            }
        },
        unshift: function() {
            this.inKey = 'LoadSelectedTrack';
        },
    });

    this.cue_button = new components.CueButton({
        midi: [0x90 + midi_chan, 0x01],
        off: 0x01,
        sendShifted: true,
        shiftControl: true,
        shiftOffset: 4,
    });

    this.sync_button = new components.SyncButton({
        midi: [0x90 + midi_chan, 0x02],
        off: 0x01,
        sendShifted: true,
        shiftControl: true,
        shiftOffset: 1,
    });

    this.pfl_button = new components.Button({
        midi: [0x90 + midi_chan, 0x1B],
        key: 'pfl',
        off: 0x01,
        type: components.Button.prototype.types.toggle,
        connect: function() {
            components.Button.prototype.connect.call(this);
            this.connections[1] = engine.makeConnection(this.group, this.outKey, MixtrackPlatinum.pflToggle.bind(this));
        },
    });

    this.pitch = new components.Pot({
        inKey: 'rate',
        invert: true,
    });
    if (!this.active) {
        this.pitch.firstValueReceived = true;
    }

    var pitch_or_keylock = function (channel, control, value, status, group) {
        if (this.other.inGetValue() > 0.0 && this.isPress(channel, control, value, status)) {
            // toggle keylock, both keys pressed
            script.toggleControl(this.group, "keylock");
        }
        else {
            components.Button.prototype.input.call(this, channel, control, value, status, group);
        }
    };
    this.pitch_bend_up = new components.Button({
        inKey: 'rate_temp_up',
        input: pitch_or_keylock,
    });
    this.pitch_bend_down = new components.Button({
        inKey: 'rate_temp_down',
        input: pitch_or_keylock,
    });
    this.pitch_bend_up.other = this.pitch_bend_down;
    this.pitch_bend_down.other = this.pitch_bend_up;

    var key_up_or_down = function (channel, control, value, status, group) {
        this.is_pressed = this.isPress(channel, control, value, status);
        if (this.is_pressed) {
            if (this.other.is_pressed) {
                // reset if both buttons are pressed
                engine.setValue(deck.currentDeck, "pitch_adjust", 0.0);
            }
            else {
                this.inSetValue(1.0);
            }
        }
    };
    this.key_up = new components.Button({
        inKey: 'pitch_up',
        direction: 1,
        input: key_up_or_down,
    });
    this.key_down = new components.Button({
        inKey: 'pitch_down',
        direction: -1,
        input: key_up_or_down,
    });
    this.key_up.other = this.key_down;
    this.key_down.other = this.key_up;

    loop_base = function(midino, obj) {
        return _.assign({
            midi: [0x94 + midi_chan, midino],
            on: 0x01,
            sendShifted: true,
            shiftChannel: true,
            shiftOffset: -0x10,
        }, obj);
    };

    this.normal_manloop = new components.ComponentContainer({
        loop_in: new components.Button(loop_base(0x38, {
            inKey: 'loop_in',
            outKey: 'loop_start_position',
            outValueScale: function (value) {
                return (value != -1) ? this.on : this.off;
            },
        })),
        loop_out: new components.Button(loop_base(0x39, {
            inKey: 'loop_out',
            outKey: 'loop_end_position',
            outValueScale: function (value) {
                return (value != -1) ? this.on : this.off;
            },
        })),
        loop_toggle: new components.LoopToggleButton(loop_base(0x32, {})),
        loop_halve: new components.Button(loop_base(0x34, {
            key: 'loop_halve',
            input: function(channel, control, value, status) {
                if (this.isPress(channel, control, value, status)) {
                    engine.setValue(deck.currentDeck, "loop_scale", 0.5);
                }
            },
        })),
        loop_double: new components.Button(loop_base(0x35, {
            key: 'loop_double',
            input: function(channel, control, value, status) {
                if (this.isPress(channel, control, value, status)) {
                    engine.setValue(deck.currentDeck, "loop_scale", 2.0);
                }
            },
        })),
    });
    this.manloop = this.normal_manloop;

    this.pad_mode = new components.Component({
        input: function (channel, control, value, status, group) {
            // only handle button down events
            if (value != 0x7F) return;
        },
        shift: function() {
            this.isShifted = true;
        },
        unshift: function() {
            this.isShifted = false;
        },
    });

    this.EqEffectKnob = function (group, in_key, fx_key, filter_knob) {
        this.unshift_group = group;
        this.unshift_key = in_key;
        this.fx_key = fx_key;
        if (filter_knob) {
            this.shift_key = 'super1';
        }
        this.ignore_next = null;
        components.Pot.call(this, {
            group: group,
            inKey: in_key,
        });
    };
    this.EqEffectKnob.prototype = new components.Pot({
        input: function (channel, control, value, status, group) {
            // if the control group and key has changed, ignore_next will hold
            // the old settings. We need to tell the soft takeover engine to
            // ignore the next values for that control so that when we
            // eventually switch back to it, soft takeover will manage it
            // properly.
            //
            // We call IgnoreNextValue() here instead of in shift()/unshift()
            // (via connect()/disconnect()) because if we did that, pressing
            // the shift key would cause the next value on the control to be
            // ignored even if the control wasn't moved, which would trigger
            // a phantom soft takeover if the control was moved fast enough. We
            // only need to IgnoreNextValue() if the control has actually moved
            // after switching the target group/key.
            if (this.ignore_next) {
                engine.softTakeoverIgnoreNextValue(this.ignore_next.group, this.ignore_next.key);
                this.ignore_next = null;
            }
            components.Pot.prototype.input.call(this, channel, control, value, status, group);
        },
        connect: function() {
            // enable soft takeover on our controls
            for (var i = 1; i <= 3; i ++) {
                var group = '[EffectRack1_EffectUnit' + eu.currentUnitNumber + '_Effect' + i + ']';
                engine.softTakeover(group, this.fx_key, true);
            }
            components.Pot.prototype.connect.call(this);
        },
        shift: function() {
            var focused_effect = engine.getValue(eu.group, "focused_effect");
            if (focused_effect === 0) {
                // we need this here so that shift+filter works with soft
                // takeover because touching the touch strip disables it each
                // time
                if (this.shift_key) {
                    engine.softTakeover(eu.group, this.shift_key, true);
                    this.switchControl(eu.group, this.shift_key);
                }
            }
            else {
                var group = '[EffectRack1_EffectUnit' + eu.currentUnitNumber + '_Effect' + focused_effect + ']';
                this.switchControl(group, this.fx_key);
            }
        },
        unshift: function() {
            this.switchControl(this.unshift_group, this.unshift_key);
        },
        switchControl: function(group, key) {
            if (this.group != group || this.inKey != key) {
                this.ignore_next = { 'group': this.group, 'key': this.inKey };
            }
            this.group = group;
            this.inKey = key;
        },
    });

    var eq_group = '[EqualizerRack1_' + this.currentDeck + '_Effect1]';
    this.high_eq = new this.EqEffectKnob(eq_group, 'parameter3', 'parameter3');
    this.mid_eq = new this.EqEffectKnob(eq_group, 'parameter2', 'parameter4');
    this.low_eq = new this.EqEffectKnob(eq_group, 'parameter1', 'parameter5');

    this.filter = new this.EqEffectKnob(
        '[QuickEffectRack1_' + this.currentDeck + ']',
        'super1',
        'parameter1',
        true);

    this.gain = new this.EqEffectKnob(
        this.currentDeck,
        'pregain',
        'parameter2');

    this.reconnectComponents(function (c) {
        if (c.group === undefined) {
            c.group = deck.currentDeck;
        }
    });

    this.setActive = function(active) {
        this.active = active;

        if (!active) {
            // trigger soft takeover on the pitch control
            this.pitch.disconnect();
        }
    };
};

MixtrackPlatinum.Deck.prototype = new components.Deck();

MixtrackPlatinum.BrowseKnob = function() {
    this.knob = new components.Encoder({
        group: '[Library]',
        input: function (channel, control, value, status, group) {
            if (value === 1) {
                engine.setParameter(this.group, this.inKey + 'Down', 1);
            } else if (value === 127) {
                engine.setParameter(this.group, this.inKey + 'Up', 1);
            }
        },
        unshift: function() {
            this.inKey = 'Move';
        },
        shift: function() {
            this.inKey = 'Scroll';
        },
    });

    this.button = new components.Button({
        group: '[Library]',
        inKey: 'GoToItem',
        unshift: function() {
            this.inKey = 'GoToItem';
        },
        shift: function() {
            this.inKey = 'MoveFocusForward';
        },
    });
};

MixtrackPlatinum.BrowseKnob.prototype = new components.ComponentContainer();

MixtrackPlatinum.encodeNumToArray = function(number) {
    var number_array = [
        (number >> 28) & 0x0F,
        (number >> 24) & 0x0F,
        (number >> 20) & 0x0F,
        (number >> 16) & 0x0F,
        (number >> 12) & 0x0F,
        (number >> 8) & 0x0F,
        (number >> 4) & 0x0F,
        number & 0x0F,
    ];

    if (number < 0) number_array[0] = 0x07;
    else number_array[0] = 0x08;

    return number_array;
};

MixtrackPlatinum.sendScreenDurationMidi = function(deck, duration) {
    if (duration < 1) {
        duration = 1;
    }
    durationArray = MixtrackPlatinum.encodeNumToArray(duration - 1);

    var bytePrefix = [0xF0, 0x00, 0x20, 0x7F, deck, 0x03];
    var bytePostfix = [0xF7];
    var byteArray = bytePrefix.concat(durationArray, bytePostfix);
    midi.sendSysexMsg(byteArray, byteArray.length);
};

MixtrackPlatinum.sendScreenTimeMidi = function(deck, time) {
    var timeArray = MixtrackPlatinum.encodeNumToArray(time);

    var bytePrefix = [0xF0, 0x00, 0x20, 0x7F, deck, 0x04];
    var bytePostfix = [0xF7];
    var byteArray = bytePrefix.concat(timeArray, bytePostfix);
    midi.sendSysexMsg(byteArray, byteArray.length);
};

MixtrackPlatinum.sendScreenBpmMidi = function(deck, bpm) {
    // bpm = 22900.0
    const bpmArray = MixtrackPlatinum.encodeNumToArray(bpm);
    bpmArray.shift();
    bpmArray.shift();

    var bytePrefix = [0xF0, 0x00, 0x20, 0x7F, deck, 0x01];
    var bytePostfix = [0xF7];
    var byteArray = bytePrefix.concat(bpmArray, bytePostfix);
    midi.sendSysexMsg(byteArray, byteArray.length);
};

MixtrackPlatinum.elapsedToggle = function (channel, control, value, status, group) {
    if (value != 0x7F) return;

    var current_setting = engine.getValue('[Controls]', 'ShowDurationRemaining');
    if (current_setting === 0) {
        // currently showing elapsed, set to remaining
        engine.setValue('[Controls]', 'ShowDurationRemaining', 1);
    } else if (current_setting === 1) {
        // currently showing remaining, set to elapsed
        engine.setValue('[Controls]', 'ShowDurationRemaining', 0);
    } else {
        // currently showing both (that means we are showing remaining, set to elapsed
        engine.setValue('[Controls]', 'ShowDurationRemaining', 0);
    }
};

MixtrackPlatinum.timeElapsedCallback = function(value, group, control) {
    // 0 = elapsed
    // 1 = remaining
    // 2 = both (we ignore this as the controller can't show both)
    var on_off;
    if (value === 0) {
        // show elapsed
        on_off = 0x00;
    } else if (value === 1) {
        // show remaining
        on_off = 0x7F;
    } else {
        // both, ignore the event
        return;
    }

    // update all 4 decks on the controller
    midi.sendShortMsg(0x90, 0x46, on_off);
    midi.sendShortMsg(0x91, 0x46, on_off);
    midi.sendShortMsg(0x92, 0x46, on_off);
    midi.sendShortMsg(0x93, 0x46, on_off);
};

MixtrackPlatinum.timeMs = function(deck, position, duration) {
    return Math.round(duration * position * 1000);
};

// these functions track if the user has let go of the jog wheel but it is
// still spinning
MixtrackPlatinum.scratch_timer = []; // initialized before use (null is an acceptable value)
MixtrackPlatinum.scratch_tick = [];  // initialized before use
MixtrackPlatinum.resetScratchTimer = function (deck, tick) {
    if (!MixtrackPlatinum.scratch_timer[deck]) return;
    MixtrackPlatinum.scratch_tick[deck] = tick;
};

MixtrackPlatinum.startScratchTimer = function (deck) {
    if (MixtrackPlatinum.scratch_timer[deck]) return;

    MixtrackPlatinum.scratch_tick[deck] = 0;
    MixtrackPlatinum.scratch_timer[deck] = engine.beginTimer(20, () => {
        MixtrackPlatinum.scratchTimerCallback(deck);
    });
};

MixtrackPlatinum.stopScratchTimer = function (deck) {
    if (MixtrackPlatinum.scratch_timer[deck]) {
        engine.stopTimer(MixtrackPlatinum.scratch_timer[deck]);
    }
    MixtrackPlatinum.scratch_timer[deck] = null;
};

MixtrackPlatinum.scratchTimerCallback = function (deck) {
    // here we see if the platter is still physically moving even though the
    // platter is not being touched. For forward motion, we stop scratching
    // before the platter has physically stopped  and delay a little longer
    // when moving back. This is to mimic actual vinyl better.
    if ((MixtrackPlatinum.scratch_direction[deck] // forward
            && Math.abs(MixtrackPlatinum.scratch_tick[deck]) > 2)
        || (!MixtrackPlatinum.scratch_direction[deck] // backward
            && Math.abs(MixtrackPlatinum.scratch_tick[deck]) > 1))
    {
        // reset tick detection
        MixtrackPlatinum.scratch_tick[deck] = 0;
        return;
    }

    MixtrackPlatinum.scratchDisable(deck);
};

MixtrackPlatinum.scratchDisable = function (deck) {
    MixtrackPlatinum.searching[deck] = false;
    MixtrackPlatinum.stopScratchTimer(deck);
    engine.scratchDisable(deck, false);
};

MixtrackPlatinum.scratchEnable = function (deck) {
    var alpha = 1.0/8;
    var beta = alpha/32;

    var ramp = true

    // https://github.com/mixxxdj/mixxx/wiki/midi%20scripting#scratching-and-jog-wheels
    // the resolution of the MIDI control (in intervals per revolution, typically 128.)
    var intervalsPerRev = 1400

    /*
        Изначально intervalsPerRev было 1240.
        Увеличение значения - led индикация отстаёт от реальной позиции джога.
        Уменьшение наоборот, делает индикацию быстрее.
        Значение зависит от размера аудио буффера, устройства вывода, количества активных дек, и похоже ещё от фазы
        луны и расположения звёзд.

        SP404MK2 в качестве аудио выхода, 2 деки, буффер 2.9ms = 1400.
    */

    engine.scratchEnable(deck, intervalsPerRev, 33+1/3, alpha, beta, ramp);
    MixtrackPlatinum.stopScratchTimer(deck);
};

// The button that enables/disables scratching
// these arrays are indexed from 1, so we initialize them with 5 values
MixtrackPlatinum.touching = [false, false, false, false, false];
MixtrackPlatinum.searching = [false, false, false, false, false];
MixtrackPlatinum.wheelTouch = function (channel, control, value, status, group) {
    var deck = channel + 1;

    // ignore touch events if not in vinyl mode
    if (!MixtrackPlatinum.shift
        && !MixtrackPlatinum.searching[deck]
        && !MixtrackPlatinum.wheel[channel]
        && value != 0)
    {
        return;
    }

    MixtrackPlatinum.touching[deck] = 0x7F == value;


    // don't start scratching if shift is pressed
    if (value === 0x7F
        && !MixtrackPlatinum.shift
        && !MixtrackPlatinum.searching[deck])
    {
        MixtrackPlatinum.scratchEnable(deck);
    }
    else if (value === 0x7F
             && (MixtrackPlatinum.shift
                || MixtrackPlatinum.searching[deck]))
    {
        MixtrackPlatinum.scratchDisable(deck);
        MixtrackPlatinum.searching[deck] = true;
        MixtrackPlatinum.stopScratchTimer(deck);
    }
    else {    // If button up
        MixtrackPlatinum.startScratchTimer(deck);
    }
};

// The wheel that actually controls the scratching
// indexed by deck numbers starting at 1, so include an extra element
MixtrackPlatinum.scratch_direction = [null, null, null, null, null]; // true == forward
MixtrackPlatinum.scratch_accumulator = [0, 0, 0, 0, 0];
MixtrackPlatinum.last_scratch_tick = [0, 0, 0, 0, 0];
MixtrackPlatinum.wheelTurn = function (channel, control, value, status, group) {
    var deck = channel + 1;
    var direction;
    var newValue;
    if (value < 64) {
        direction = true;
    } else {
        direction = false;
    }

    // if the platter is spun fast enough, value will wrap past the 64 midpoint
    // but the platter will be spinning in the opposite direction we expect it
    // to be
    var delta = Math.abs(MixtrackPlatinum.last_scratch_tick[deck] - value);
    if (MixtrackPlatinum.scratch_direction[deck] !== null && MixtrackPlatinum.scratch_direction[deck] != direction && delta < 64) {
        direction = !direction;
    }

    if (direction) {
        newValue = value;
    } else {
        newValue = value - 128;
    }

    // detect searching the track
    if (MixtrackPlatinum.searching[deck]) {
        var position = engine.getValue(group, 'playposition');
        if (position <= 0) position = 0;
        if (position >= 1) position = 1;
        engine.setValue(group, 'playposition', position + newValue * 0.0001);
        MixtrackPlatinum.resetScratchTimer(deck, newValue);
        return;
    }

    // stop scratching if the wheel direction changes and the platter is not
    // being touched
    if (MixtrackPlatinum.scratch_direction[deck] === null) {
        MixtrackPlatinum.scratch_direction[deck] = direction;
    }
    else if (MixtrackPlatinum.scratch_direction[deck] != direction) {
        if (!MixtrackPlatinum.touching[deck]) {
            MixtrackPlatinum.scratchDisable(deck);
        }
        MixtrackPlatinum.scratch_accumulator[deck] = 0;
    }

    MixtrackPlatinum.last_scratch_tick[deck] = value;
    MixtrackPlatinum.scratch_direction[deck] = direction;
    MixtrackPlatinum.scratch_accumulator[deck] += Math.abs(newValue);

    // handle scratching
    if (engine.isScratching(deck)) {
        engine.scratchTick(deck, newValue); // Scratch!
        MixtrackPlatinum.resetScratchTimer(deck, newValue);
    }
    // handle beat jumping
    else if (MixtrackPlatinum.shift) {
        if (MixtrackPlatinum.scratch_accumulator[deck] > 61) {
            MixtrackPlatinum.scratch_accumulator[deck] -= 61;
            if (direction) { // forward
                engine.setParameter(group, 'beatjump_1_forward', 1);
            } else {
                engine.setParameter(group, 'beatjump_1_backward', 1);
            }
        }
    }
    // handle pitch bending
    else {
        engine.setValue(group, 'jog', newValue * 0.1); // Pitch bend
    }
};

MixtrackPlatinum.wheel = []; // initialized in the MixtrackPlatinum.init() function
MixtrackPlatinum.wheelToggle = function (channel, control, value, status, group) {
    // if (value != 0x7F) return;
    // MixtrackPlatinum.wheel[channel] = !MixtrackPlatinum.wheel[channel];
    // var on_off = 0x01;
    // if (MixtrackPlatinum.wheel[channel]) on_off = 0x7F;
    // midi.sendShortMsg(0x90 | channel, 0x07, on_off);
};

MixtrackPlatinum.deckSwitch = function (channel, control, value, status, group) {
    var deck = channel + 1;
    MixtrackPlatinum.decks[deck].setActive(value == 0x7F);

    // change effects racks
    if (MixtrackPlatinum.decks[deck].active && (channel == 0x00 || channel == 0x02)) {
        MixtrackPlatinum.effects[1].setCurrentUnit(deck);
    }
    else if (MixtrackPlatinum.decks[deck].active && (channel == 0x01 || channel == 0x03)) {
        MixtrackPlatinum.effects[2].setCurrentUnit(deck);
    }

    // also zero vu meters
    if (value != 0x7F) return;
    midi.sendShortMsg(0xBF, 0x44, 0);
    midi.sendShortMsg(0xBF, 0x45, 0);
};

// zero vu meters when toggling pfl
MixtrackPlatinum.pflToggle = function(value, group, control) {
    midi.sendShortMsg(0xBF, 0x44, 0);
    midi.sendShortMsg(0xBF, 0x45, 0);
};

MixtrackPlatinum.vuCallback = function(value, group, control) {
    // the top LED lights up at 81
    var level = value * 80;

    // if any channel pfl is active, show channel levels
    if (engine.getValue('[Channel1]', 'pfl')
        || engine.getValue('[Channel2]', 'pfl')
        || engine.getValue('[Channel3]', 'pfl')
        || engine.getValue('[Channel4]', 'pfl'))
    {
        if (engine.getValue(group, "peak_indicator")) {
            level = 81;
        }

        if (group == '[Channel1]' && MixtrackPlatinum.decks[1].active) {
            midi.sendShortMsg(0xBF, 0x44, level);
        }
        else if (group == '[Channel3]' && MixtrackPlatinum.decks[3].active) {
            midi.sendShortMsg(0xBF, 0x44, level);
        }
        else if (group == '[Channel2]' && MixtrackPlatinum.decks[2].active) {
            midi.sendShortMsg(0xBF, 0x45, level);
        }
        else if (group == '[Channel4]' && MixtrackPlatinum.decks[4].active) {
            midi.sendShortMsg(0xBF, 0x45, level);
        }
    }
    else if (group == '[Main]' && control == 'vu_meter_left') {
        if (engine.getValue(group, "peak_indicator_left")) {
            level = 81;
        }
        midi.sendShortMsg(0xBF, 0x44, level);
    }
    else if (group == '[Main]' && control == 'vu_meter_right') {
        if (engine.getValue(group, "peak_indicator_right")) {
            level = 81;
        }
        midi.sendShortMsg(0xBF, 0x45, level);
    }
};


// track the state of the shift key
MixtrackPlatinum.shift = false;
MixtrackPlatinum.shiftToggle = function (channel, control, value, status, group) {
    MixtrackPlatinum.shift = value == 0x7F;

    MixtrackPlatinum.octopusInputs.shift(MixtrackPlatinum.shift);

    if (MixtrackPlatinum.shift) {
        MixtrackPlatinum.decks.shift();
        MixtrackPlatinum.effects.shift();
        MixtrackPlatinum.browse.shift();

        // reset the beat jump scratch accumulators
        MixtrackPlatinum.scratch_accumulator[1] = 0;
        MixtrackPlatinum.scratch_accumulator[2] = 0;
        MixtrackPlatinum.scratch_accumulator[3] = 0;
        MixtrackPlatinum.scratch_accumulator[4] = 0;
    }
    else {
        MixtrackPlatinum.decks.unshift();
        MixtrackPlatinum.effects.unshift();
        MixtrackPlatinum.browse.unshift();
    }
};

class NumarkPlatinumPadMapper {
    constructor() {
        this.groups = [
            "[Channel1]",
            "[Channel2]",
            "[Channel3]",
            "[Channel4]",
        ];

        const mapGroupToChannel = new Map();
        mapGroupToChannel["[Channel1]"] = 0x04;
        mapGroupToChannel["[Channel2]"] = 0x05;
        mapGroupToChannel["[Channel3]"] = 0x06;
        mapGroupToChannel["[Channel4]"] = 0x07;

        const mapMidiToPadUnshift = new Map();
        for (let i = 0; i < 8; i++) {
            mapMidiToPadUnshift[0x14 + i] = i + 1;
        }

        const mapMidiToPadShift = new Map();
        for (let i = 0; i < 8; i++) {
            mapMidiToPadShift[0x1C + i] = i + 1;
        }

        const mapPadToLedHex = new Map();
        for (let i = 0; i < 8; i++) {
            mapPadToLedHex[1 + i] = [0x14 + i, 0x1C + i];
        }

        this.mapMidiToPadUnshift = mapMidiToPadUnshift;
        this.mapMidiToPadShift = mapMidiToPadShift;
        this.mapPadToLedHex = mapPadToLedHex;
        this.mapGroupToChannel = mapGroupToChannel;
    }

    requestPadAddress(group, numberPad) {
        const channel = this.mapGroupToChannel[group];
        const address = new octopus.MidiAddress({
            midinoArray: this.mapPadToLedHex[numberPad],
            channel: channel,
        });
        return address;
    }

    midiToPad(group, control, channel, isShift) {
        // console.log("NumarkPlatinumPadMapper: midiToPad() " +
        //     " group=" + group +
        //     ", control=" + control +
        //     ", channel=" + channel +
        //     ", isShift=" + isShift
        // );
        const map = isShift ? this.mapMidiToPadShift : this.mapMidiToPadUnshift;
        return map[control];
    }

    generateControl(inputs, key, status, group, midino) {
        const formatToHex = function (dec) {
            return "0x" + ("0"+(Number(dec).toString(16))).slice(-2).toUpperCase()
        }
        return `
            <control>
                <group>${group}</group>
                <key>${inputs}.${key}</key>
                <description>generated by NumarkPlatinumPadMapper.generateXml()</description>
                <status>${formatToHex(status)}</status>
                <midino>${formatToHex(midino)}</midino>
                <options>
                    <script-binding/>
                </options>
            </control>
      `;
    }

    generateXml(inputs) {
        const generateControlsForPads = (group, channel) => {
            var result = "";
            for (let number = 1; number <= 8; number++) {
                const status = 0x90 | channel;
                const midinoArray = this.mapPadToLedHex[number];

                midinoArray.forEach((midino) => {
                    result = result + this.generateControl(
                        inputs,
                        "input",
                        status,
                        group,
                        midino,
                    );
                })
            }
            return result;
        }

        var result = "";
        this.groups.forEach((group) => {
            const channel = this.mapGroupToChannel[group];

            // я хуй знает что это за прикол деки вешать на каналы начиная с 5го, при этом кнопки wheel 
            // номеруются по человечески с 1...
            const status = 0x90 | (channel - 4);
            
            result = result + this.generateControl(
                inputs,
                "switchLayerButton",
                status,
                group,
                0x07,
            );
            result = result +  generateControlsForPads(group, channel);
        });
        return result;
    }
}
