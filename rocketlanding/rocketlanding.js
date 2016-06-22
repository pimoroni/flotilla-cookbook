"use strict";

var width = 400;
var height = 400;
var level_height = 4000;

var fps = 30;
var mpf = 1000 / fps;

var keysDown = {};

function millis() {
    return (new Date()).getTime();
}

var gravity = new Vector2d(0, 0.98);
var field = new Field(width, height, level_height);
var lander = new Lander(field, width / 2, height / 2);

var render = function() {
    lander.render();
};

var update = function() {
    lander.update();
};

var step = function() {
    update();
    render();
    animate(step);
};

function Vector2d(x, y) {
    this.x = x;
    this.y = y;
}


Vector2d.prototype.rotate = function(origin, angle) {
    var radians = (Math.PI / 180) * angle,
        cos = Math.cos(radians),
        sin = Math.sin(radians),
        nx = (cos * (this.x - origin.x)) + (sin * (this.y - origin.y)) + origin.x,
        ny = (cos * (this.y - origin.y)) - (sin * (this.x - origin.x)) + origin.y;
    this.x = nx;
    this.y = ny;
}

Vector2d.prototype.magnitude = function() {
    return Math.abs(Math.sqrt((this.x * this.x) + (this.y * this.y)));
}

Vector2d.prototype.add = function(vector) {
    this.x += vector.x;
    this.y += vector.y;
}

function Field(width, height, level_height) {
    this.width = width;
    this.height = height;
    this.dom = $('<div>').addClass('field').css({
        width: width,
        height: height
    }).appendTo('.canvas');

    this.level = $('<div>').addClass('level').css({
        height: level_height
    }).appendTo(this.dom);
    this.level_height = level_height;

    this.landing_pad = $('<div>').addClass('landing').css({
        left: 10
    }).appendTo(this.level);
    this.landing_pad_total_width = 45 + 3 + 10;
    this.landing_pad_left = 10;

    var stars = 100;
    while (stars--) {
        var star_top = (this.level_height - 200) * Math.random();
        var star_size = 1 + (2 * Math.random());
        $('<div>').addClass('star').css({
            width: star_size,
            height: star_size,
            left: this.width * Math.random(),
            top: star_top,
            opacity: 1.0 - (0.95 * star_top / (this.level_height - 200)) // Fade out stars as we enter atmosphere
        }).appendTo(this.level);
    }

    var clouds = 10;
    var max_cloud_top = this.level_height - (this.level_height / 5) + (((this.level_height / 5) - 200));

    while (clouds--) {
        var cloud_top = this.level_height - (this.level_height / 5) + (((this.level_height / 5) - 200) * Math.random());

        var height_scale = cloud_top / max_cloud_top;

        var cloud_size = 50 - (30 * height_scale) + (10 * Math.random());
        $('<div>').addClass('cloud').css({
            width: cloud_size,
            height: cloud_size,
            opacity: 0.8 + (0.2 * Math.random()),
            left: this.width * Math.random(),
            top: cloud_top,
            'z-index': 1 + (10 * Math.random())
        }).appendTo(this.level);
    }
}

Field.prototype.set_landing_pad = function(left, width) {
    this.landing_pad_total_width = width + 3 + 10;
    this.landing_pad_left = 10 + (left * (this.width - this.landing_pad_total_width - 10 - 10));
    this.landing_pad.css({
        left: this.landing_pad_left,
        width:width
    })
}

function Lander(field, x, y) {
    this.difficulty = 0;
    this.field = field;
    this.rotation = 0;
    this.rotational_velocity = 0;
    this.position = new Vector2d(200, 200);
    this.velocity = new Vector2d(0, 0);
    this.heat = 0;
    this.fuel = 99;
    this.hull = 99;
    this.score = 0;
    this.fuel_gauge = $('.fuel strong');
    this.hull_gauge = $('.hull strong');
    this.height_gauge = $('.height strong');
    this.score_gauge = $('.score strong');
    this.last_time = 0;
    this.remainder = 0;
    this.landed = false;
    this.sinking = false;

    this.last_event = 0;

    this.dom = $('<div>').addClass('lander').css({
        left: this.position.x,
        top: this.position.y
    }).appendTo(field.level);
}

Lander.prototype.render = function() {
    var border = '';

    var heat = this.heat;
    if(heat > 220) heat = 220;

    if(this.sinking){
      border = 'rgb(128,' + Math.round(128 - (heat/2)) + ',' + Math.round(255 - (heat/3)) + ')';
    }
    else if (this.hull <= 0){
      border = 'transparent';
    }
    else
    {
      border = 'rgb(255,' + Math.round(255 - heat) + ',' + Math.round(255 - heat) + ')';
    }

    this.dom.css({
        left: this.position.x,
        top: this.position.y,
        'transform': 'rotate(' + this.rotation + 'deg)',
        'border-bottom-color': border
    });

    this.guages();

    var offset_top = -this.position.y + (this.field.height / 2);

    if (offset_top > 0) offset_top = 0;
    if (offset_top < -(this.field.level_height - (this.field.height / 2))) offset_top = -(this.field.level_height - (this.field.height / 2));
    this.field.level.css({
        top: offset_top
    })
}
Lander.prototype.reset = function(win) {

    if(win){
      this.difficulty += 0.1;
    }
    else
    {
      this.difficulty -= 0.1;
    }

    if(this.difficulty > 1) this.difficulty = 1;
    if(this.difficulty < 0) this.difficulty = 0;

    this.rotation = (Math.random() * 360) - 180;
    this.rotational_velocity = (Math.random() * 4) - 2;
    this.position = new Vector2d(100 + (Math.random() * 200), 50);
    this.velocity = new Vector2d(0, 0);

    this.heat = 0;
    this.fuel = 99 - (50 * this.difficulty);
    this.hull = 99 - (50 * this.difficulty);

    if(!win) this.score = 0;

    this.landed = false;
    this.sinking = false;
    this.last_event = 0;
    this.dom.removeClass('boost boost-small steer-left steer-right esplode');

    this.field.set_landing_pad(Math.random(), 40 - (40 * this.difficulty) + (10 * Math.random()));
}
Lander.prototype.guages = function() {
    var height = 100 - ((this.position.y / this.field.level_height) * 100);

    if(this.fuel < 0) this.fuel = 0;
    if(this.hull < 0) this.hull = 0;
    if(height < 0) height = 0;

    this.fuel_gauge.text(Math.round(this.fuel));
    this.hull_gauge.text(Math.round(this.hull));
    this.height_gauge.text(Math.round(height) + 'km');
    this.score_gauge.text(Math.round(this.score));
}
Lander.prototype.update = function(joystick, slider) {
    var this_time = millis();
    if (this.last_time == 0) this.last_time = this_time;

    var delta = this_time - this.last_time;
    this.last_time = this_time;
    var time = (delta / mpf) + this.remainder;
    var cycles = Math.floor(time);
    this.remainder = time % 1;

    while (cycles--) {
        this.integrate(joystick, slider, this_time);
    }

}

var joystick_x = 0;

Lander.prototype.integrate = function(joystick, slider, t) {

    if(this.landed){
      this.dom.removeClass('boost boost-small steer-left steer-right');

      if(t - this.last_event > 1000) this.reset(true);
      return;
    }

    if(this.hull <= 0){
      this.dom.removeClass('boost boost-small steer-left steer-right');
      this.dom.addClass('esplode');

      if(this.last_event == 0) this.last_event = t;
      if(t - this.last_event > 1000) this.reset(false);

      return;
    }

    if (this.sinking) {

       this.dom.removeClass('boost boost-small steer-left steer-right');

    }
    else
    {


      if (joystick < -0.2 && this.fuel > 0) {
          this.rotational_velocity += 1 * joystick;
          this.dom.addClass('steer-left').removeClass('steer-right');
          this.fuel -= 0.05
      } else if (joystick > 0.2 && this.fuel > 0) {
          this.rotational_velocity += 1 * joystick;
          this.dom.addClass('steer-right').removeClass('steer-left');
          this.fuel -= 0.05
      } else {
          this.dom.removeClass('steer-left steer-right')
      }


      var action_thrust = slider > 0.01;

      if (action_thrust && this.fuel > 0) {
          var thrust = new Vector2d(0, -0.6 + (-1.2 * slider)); // min 0.99, max 2.0
          thrust.rotate(new Vector2d(0, 0), -this.rotation);
          this.velocity.add(thrust);
          this.dom.addClass('boost');
          this.rotation *= 1.01;
          this.fuel -= 0.2 * slider;

          if (slider > 0.5) {
              this.dom.addClass('boost').removeClass('boost-small');
          } else {

              this.dom.addClass('boost-small').removeClass('boost');
          }
      } else {
          this.dom.removeClass('boost boost-small');
      }

      if (keysDown[32]) {
          this.velocity.y *= 0.5;
      }

      if (this.velocity.y > 5 && this.position.y > (this.field.level_height / 4)) {
          this.heat += (this.velocity.y - 5) / 3;
          this.rotation *= 1.05;
      }

      if (this.heat > 30) {
          this.hull -= (this.heat-30) / 400;
      }

    }

    // Translate portion of y velocity into x based upon rotation
    this.velocity.x += (Math.abs(this.velocity.y) / 10) * (this.rotation / 180 / 2); // Steering effect of spin

    this.rotation += this.rotational_velocity;
    this.position.add(this.velocity);

    // Force damping
    this.heat *= 0.98;
    if(this.sinking){
      this.heat *= 0.8;
      this.velocity.y *= 0.7;
    }

    this.rotational_velocity *= 0.90;
    this.rotation *= 0.97;
    this.velocity.y *= 0.95;
    this.velocity.x *= 0.95;



    // Bounds checking for:

    // Heat
    if (this.heat < 0) this.heat = 0;

    // Rotation
    if (this.rotation > 180) {
        this.rotation -= 360;
    }
    if (this.rotation < -180) {
        this.rotation += 360;
    }

    // Left/Right Edge of field
    if (this.position.x - 10 < 0) {
        this.position.x = 10;
        if (this.velocity.x < -2) {
            this.hull -= Math.abs(this.velocity.x) / 4
        }
        this.velocity.x *= -0.7;
    }
    if (this.position.x + 10 > field.width) {
        this.position.x = field.width - 10;
        if (this.velocity.x > 2) {
            this.hull -= Math.abs(this.velocity.x) / 4
        }
        this.velocity.x *= -0.7;
    }


    // Bottom of playing field
    if( this.sinking ){
        this.velocity.add(gravity);
        if(this.position.y >= this.field.level_height + 200){

          this.reset(false);
          return;
        }
    }
    else
    {
      if (this.position.x >= this.field.landing_pad_left && this.position.x <= this.field.landing_pad_left + this.field.landing_pad_total_width) {

          // Coming down to land on the pad
          if (this.position.y + 5 > this.field.level_height) {
              if (this.velocity.y < 0){
                 this.velocity.y *= -0.5;
              }

              if (this.velocity.y > 3) {
                  this.hull -= this.velocity.y * 4;
              }
              if( this.rotation > 10 || this.rotation < -10 ){
                this.hull -= (Math.abs(this.rotation) / 180) * 40;
              }

              this.position.y = this.field.level_height - 5; // Place on top of ship
              this.velocity.y = 0;
              this.velocity.x *= 0.5;
              this.rotation *= 0.5;

              if (!this.landed && this.hull > 0) {
                  this.last_event = t;
                  this.landed = true;
                  this.score += this.hull + this.fuel;
              }
          } else {
              this.velocity.add(gravity);
          }

      } else {

          // Splashing down!
          if (this.position.y + 5 > this.field.level_height + 10) {
              this.sinking = true;
              this.velocity.y *= 0.5;
              this.velocity.x *= 0.5;
              return;
          } else {
              this.velocity.add(gravity);
          }

      }


      if (this.velocity.y > 20) this.score += 1 + 1 * this.difficulty;
      if (this.rotation > 120 || this.rotation < -120) this.score++;
      if ((this.rotation > 175 || this.rotation < -175) && this.fuel > 0 && action_thrust) this.score += 10;

      if (this.fuel < 0) this.fuel = 0;
    }
}




var animate = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback) {
    window.setTimeout(callback, 1000 / 60)
};


var myApp = function() {
    self.requires = ['slider', 'joystick'];
    self.running = null;
    self.interval = null;

    self.stages = {
        'running': 0,
        'goal': 1,
        'start': 2
    };

    self.current_stage = self.stages.start;



    self.slider_value = 0;
    self.slider_values = [];
    self.dial_value = 0;
    self.dial_values = [];


    self.run = function() {

        if (self.running) return false;


        self.running = true;

        self.slider = rockpool.firstOfType('slider');

        self.motion = rockpool.firstOfType('motion');

        self.joystick = rockpool.firstOfType('joystick');

        //self.interval = setInterval(self.mainLoop,50);
        animate(self.mainLoop);

        self.start_time = millis();

    }


    self.stop = function() {

        self.running = false;
        //clearInterval(self.interval);

    }

    self.mainLoop = function() {

        var t = millis();
        var ticks = Math.round(t / 10);

        self.ms = t;
        self.elapsed_ms = self.ms - self.start_time;

        self.stage_run(t, ticks);

        if (self.running) animate(self.mainLoop);

    }

    self.reset = function() {
        self.start_time = millis();
    }


    self.stage_run = function(ms, ticks) {

        switch (self.current_stage) {
            case self.stages.start:
                if (self.joystick.inputs.direction.data.x != 0.5) {
                    self.current_stage = self.stages.running;
                }
                break;
            case self.stages.running:


                self.slider_value = 1.0 - self.slider.inputs.position.data.position
                self.slider_values.push(self.slider_value);
                self.slider_values = self.slider_values.slice(-5);
                self.slider_value = self.slider_values.reduce(function(a, b) {
                    return a + b
                });
                self.slider_value /= self.slider_values.length;


                if (self.joystick.inputs.direction.data.x == 0.5) {
                    self.joystick_value = 0;
                } else {
                    self.joystick_value = (self.joystick.inputs.direction.data.x / 1023) * 2 - 1
                }

                lander.update(self.joystick_value, self.slider_value);
                lander.render();
                break;
            case self.stages.goal:
                self.current_stage = self.stages.running;
                break;
        }



    }

    return self;
}

rockpool.runCookbookApp(myApp());