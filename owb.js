(function (root, factory) {
if (typeof define === "function" && define.amd) define([], factory);
    else if (typeof exports === "object") module.exports = factory()
    else root.owb = factory();
}(this, function () {
      "use strict";
      let domEle = document.querySelectorAll('[data-bind]');
      let bindings = {};
      let settings = {};

      function setSettings(sett) {
        return settings = sett;
      }

      /**
       * Simple utility function to add a new property to an existing object path.  Examples:
       *
       * - getPath('obj.nested', 'prop') => 'obj.nested.prop'
       * - getPath('', 'prop') => 'prop'
       */
      function getPath(path, prop) {
          if (path.length !== 0)
              return path + "." + prop;
          else
              return prop;
      }
      /**
       * function for initial binding data to html
       */
      function htmlBinding(obj) {
        if( settings.domDataAttr == undefined) settings.domDataAttr = 'bind';
        let domEle = document.querySelectorAll('[data-'+ settings.domDataAttr + ']');
        //
        [].forEach.call(domEle, function(elem, i) {
          [].forEach.call(elem.attributes, function(e,i) {
            if( e.name.indexOf('data-') === 0 && e.value != "" ) {
              let _name = e.name.slice( 5 + settings.domDataAttr.length + 1);
              let _value = e.value.split('.').reduce(function(obj,i) {return  obj ? obj[i] : undefined; }, __data);
              //
              bindings[e.value] = e.name;
              //
              if(_value) {
                if(_name.length > 0) {

                  if(elem.attributes[_name])
                    elem.attributes[_name] = _value;
                  else
                    elem.setAttribute(_name, _value);
                } else {
                  elem.innerHTML = _value;
                }
                if (settings.errorLevel == 1)
                  console.info( e.value, ' set on ', elem);
              } else {
                if(settings.errorLevel == 2)
                  elem.innerHTML = e.value + " not defined";
                else if (settings.errorLevel == 1)
                  console.error( e.value + " not defined" );
              }
            }
          })
        })
      }
      /**
       * function for chenging html after data chenge
       */
      function htmlModyfication(chenge ) {
        let _el = document.querySelectorAll("["+bindings[chenge.path]+"='"+chenge.path+"']");

        [].forEach.call(_el, function(elem, i) {
            let _name = bindings[chenge.path].slice( 5 + settings.domDataAttr.length + 1);
            
            if( bindings[chenge.path] == "data-" + settings.domDataAttr ){
              if(chenge.type == "delete-prop"){
                elem.innerHTML = "";
              } else {
                elem.innerHTML = chenge.newValue;
              }
            } else {
              if(chenge.type == "delete-prop"){
                elem.removeAttribute(_name);
              } else {
                if( elem.attributes[_name] ) {
                  elem.attributes[_name].value = chenge.newValue;
                } else elem.setAttribute(_name, chenge.newValue);
              }
            }

        })
      }
      /**
       * main function
       */
      function _create(target, validator, path, lastInPath) {
          // Keeps track of the proxies we've already made so that we don't have to recreate any.
          let proxies = {};
          let proxyHandler = {
              get: function get(target, prop) {
                  // Special properties
                  if (prop === '__target')
                      return target;
                  if (prop === '__isProxy')
                      return true;
                  // Cache target[prop] for performance
                  var value = target[prop];
                  // Functions
                  if (typeof value === 'function') {
                      return function () {
                          let args = [];
                          for (let _i = 0; _i < arguments.length; _i++) {
                              args[_i] = arguments[_i];
                          }
                          let _change = {
                              path: path,
                              property: lastInPath,
                              type: 'function-call',
                              function: prop,
                              arguments: args
                          };
                          if ( validator(_change) ) {
                              // If `this` is a proxy, be sure to apply to __target instead
                              return value.apply(this.__isProxy ? this.__target : this, args);
                          }
                      };
                  }
                  // Objects
                  else if (typeof value === 'object' && value !== null && target.hasOwnProperty(prop)) {
                      // Return existing proxy if we have one, otherwise create a new one
                      var existingProxy = proxies[prop];
                      if (existingProxy && existingProxy.__target === value) {
                          return existingProxy;
                      }
                      else {
                          var proxy = _create(value, validator, getPath(path, prop), prop);
                          proxies[prop] = proxy;
                          return proxy;
                      }
                  }
                  // All else
                  else {
                      return value;
                  }
              },
              set: function set(target, prop, value) {
                  let _change = {
                      path: getPath(path, prop),
                      type: 'set-prop',
                      property: prop,
                      oldValue: target[prop],
                      newValue: value
                  };
                  if (validator(_change)) {
                      target[prop] = value;
                      htmlModyfication(_change, settings )
                  }
                  return true;
              },
              deleteProperty: function deleteProperty(target, prop) {
                  let _change = {
                      path: getPath(path, prop),
                      type: 'delete-prop',
                      oldValue: target[prop],
                      property: prop,
                      newValue: null
                  };
                  if (validator(_change)) {
                      delete target[prop];
                      htmlModyfication(_change, settings )
                  }
                  return true;
              }
          };
          return new Proxy(target, proxyHandler);
      };
    return {
        create: function create(obj, settings, func) {
            if(obj == undefined) obj = {};
            if(func == undefined) func = function(elem){console.info(elem)};
            setSettings(settings);
            //
            // init binding
            //
            htmlBinding(obj);
            //
            return _create(obj, func, '', '');
        }
    };
}));
