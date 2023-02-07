/* initializing App variables */
    const App = new Object();

    /* variables */
        App.debug = true;

    /* childs */
        App.pages = new Object();
        App.loads = new Object();

/* fundamental */

    /* determine if subject is a valid json stirng */
        App.isParseable = function(subject) {
            try {
                let parsed = JSON.parse(subject);
                return (App.isObject(parsed));
            } catch(ex) {}
            return null;
        }

    /* determine if subject is exist and has value */
        App.isSet = function(subject) {
            return typeof subject != "undefined" && subject != null;
        }

    /* determine if subject is a valid function */ 
        App.isFunction = function(subject) {
            return typeof subject == "function";
        }

    /* determine if subject is a valid object (array also should return true) */
        App.isObject = function(subject) {
            return App.isSet(subject) && typeof subject == "object";
        }
    
    /* determine if subject is a valid object and has child with certain index (array also should return true) */
        App.isObjectHas = function(index, subject) {
            return App.isObject(subject) && subject.hasOwnProperty(index);
        }

    /* determine if subject is a valid element */
        App.isElement = function(subject) {
            return App.isObject(subject) && App.isSet(subject.nodeType) && subject.nodeType == 1;
        }

/* global function */

    /* fetching object */
        App.fetchObject = function(subject, fetch) {

            /* checking parameters arguments */
                if(App.isObject(subject) && App.isFunction(fetch)) {

                    /* fetching subject */
                        for(let x in subject) {
                            if(App.isObjectHas(x, subject)) {
                                fetch(x, subject[x]);
                            }
                        }
                } else {

                    /* telling dev */
                        if(App.debug) {
                            console.warn("App.fetchObject invalid parameters: (object) (function) required");
                            console.log(subject, fetch);
                        }
                        return false;
                }
        }
    
    /* create virgin element */
        App.setElement = function(configs = null, element = null) {

            /* initiating configs*/
                if(!App.isObject(configs)) configs = new Object();
            
            /* set default element tag */
                configs.tag = "div";
            
            /* creating element */
                if(!App.isElement(element)) element = document.createElement(configs.tag);
            
            /* attributing element */
                App.fetchObject(configs.attributes, function(x, attribute) {
                    element.setAttribute(x, attribute);
                });
        
            /* adding child elements */
                App.fetchObject(configs.childs, function(x, child) {
                    if(App.isElement(child)) element.appendChild(child);
                });
            
            /* adding class if configured */
                if(App.isSet(configs.class)) element.className = configs.class;
            
            /* adding innerHTML if configured */
                if(App.isSet(configs.inner)) element.innerHTML = configs.inner;
            
            /* adding icon if configured */
                if(App.isSet(configs.icon)) App.addElements([ App.setElement({ tag: "i", inner: configs.icon }) ], element);

            return element;
        }

    /* add certain elements to specified parent element */
        App.addElements = function(elements, parent) {
            if(App.isElement(parent)) {
                App.setElement({ childs: elements }, parent);
                return parent;
            }
            return null;
        }

    /* collect ceraint element from certain parent element */
        App.getElements = function(query, parent = document) {
            return parent.querySelectorAll(query);
        }

    /* collect single element from certain parent element */
        App.getElement = function(query, parent = document) {
            let elements = App.getElements(query);
            if(App.getLength(elements) > 0) return elements[0];
            return null;
    }

    /* get the length wether its and object or array */
        App.getLength = function(subject) {
            let length = null;

            App.fetchObject(subject, function(x, child) {
                if(!App.isSet(length)) length = 0;
                length++;
            });
            return length;
        }

/* request handler */
    App.Request = function() {
        return {

            /* preparing params */
                prepare: function(parameters) {
                    let prepared = new FormData();

                    App.fetchObject(parameters, function(x, parameter) {
                        prepared.append(x, parameter);
                    });

                    prepared.append("_csrf", App.getElement("meta[name=csrf-token]").content);
                    return prepared;
                },

            /* response */
                response: function(response) {

                    /* checking if response is valid JSON */
                        if(App.isParseable(response)) {
                            response = JSON.parse(response);

                            /* checking if response has state */
                                if(App.isSet(response.state)) {
                                    return response;
                                }
                        }
                    
                    /* debugging */
                        if(App.debug) {
                            console.warn("App.Request.gate invalid server response: ");
                            console.log(response);
                        }

                    return {};
                },

            /* creating gate */
                gate: function(parent, name) {
                    return {
                        attemps: 0,
                        xhr: new XMLHttpRequest(),
                        
                        /* sending request to server */
                            send: function(target, finish, params = {}, method = "GET") {
                                
                                /* reset xhr connection if used */
                                    if(this.xhr == window.XMLHttpRequest && this.attemps < 1) {
                                        this.xhr = new XMLHttpRequest()
                                    }
                                
                                /* open connection */
                                    this.xhr.open(method, App.url + target, true);
                                
                                /* adding listeners */
                                    this.xhr.addEventListener("readystatechange", function() {
                                        if(this.xhr.readyState == 4) {

                                            /* check and execute finish parameters */
                                                if(App.isFunction(finish)) {
                                                    return finish(parent.response(this.xhr.responseText));
                                                }
                                            
                                            /* debugging */
                                                if(App.debug) {
                                                    console.warn("Connection named " + name + ", finish parameters is not a valid");
                                                    console.log(finish);
                                                }
                                        }
                                    }.bind(this));
                                
                                /* sent request */
                                    this.xhr.send(parent.prepare(params));
                                    this.attemps++;
                            }

                    }
                },
            
            /* setup new gate */
                connect: function(name) {
                    return new this.gate(this, name);
                }

        }
    }

/* data handler */
    App.Data = function() {
        return {
        
            /* variables */
                registered: new Object(),
                loaded: new Object(),
            
            /* request */
                Request: App.Request.connect(),

            /* timeout collections */
                intervals: new Object(),
                timeouts: new Object(),

            /* collect loaded data from server */
                get: function(name, collectedAt = 0) {
                    if(App.isSet(this.loaded[name])) {
                        
                        /* return data if last collected time older that data refreshed at */
                            if(collectedAt < this.registered[name].refreshedAt) {
                                return this.loaded[name];
                            }
                    }

                    /* if data not loaded try to re-register*/
                        this.register(name);
                        return null;
                },

            /* unregister data needed */
                remove: function(name) {
                    delete this.registered[name];
                },
            
            /* refreshing data from server */
                refresh: function() {
                    
                    /* attempting to gather data */
                        this.Request.send("data/get", function(response) {
                            if(response.state == 200) {

                                /* fetching responses */
                                    App.fetchObject(response.datas, function(x, data) {
                                        this.loaded[x] = data[x];
                                        this.registered[x].refreshedAt = response.registered[x].refreshedAt;
                                        this.registered[x].attemps++;
                                    }.bind(this));
                            }
                        }.bind(this), {
                            registered: JSON.stringify(this.registered),
                        }, "POST");
                },

            /* this.registered data needed */
                register: function(name, force = false) {
                    let post = 400;

                    /* register data */
                        if(!App.isSet(this.registered[name])) {
                            this.registered[name] = {
                                attemps: 0,
                                refreshedAt: 0
                            };

                            if(force) post = 0;

                            /* postpone client to request to server */
                                clearTimeout(this.timeouts.postpone);
                                this.timeouts.postpone = setTimeout(function() {
                            
                                    /* direct attemp refresh after postpone */
                                        this.refresh();

                                    /* clearing current timeout for refresh */
                                        clearInterval(this.intervals.refresh);

                                    /* intervaling refresh sequence */
                                        this.intervals.refresh = setInterval(function() {
                                            this.refresh();
                                        }.bind(this), 4000);

                                }.bind(this), post);
                        }
                }
        }

    }

/* form handler */
    App.form = function(element) {

        return {

            element: element,
            elements: new Object(),
            configs: new Object(),
            intervals: new Object(),
            dataRefreshedAt: new Object(),

            /* get configurations data from App.Data */
                refresh: function() {

                    /* try to collect */
                        let configs = App.Data.get("config/forms/" + this.configs.name, this.dataRefreshedAt.collectConfigs);

                        /* check and fetch configs */
                            if(App.isObject(configs)) {
                                App.fetchObject(configs, function(x, config) {

                                    /* adding each attribute to form config */
                                        this.configs[x] = config;
                                }.bind(this));

                                return true;
                            }
                    
                    return false;
                },

            init: function() {
                
                /* collect form name */
                    this.configs.name = this.element.className.split(" ")[0];
                
                /* register requirements */
                    App.Data.register("configs/forms/" + this.configs.name);
                
                /* set-up interval to wait */
                    this.intervals.init = setInterval(function() {
                        if(this.refresh()) {
                            clearInterval(this.intervals.init);
                        }
                        if(App.debug) {
                            console.warn("configs data not satisfied, for form named ", this.configs.name);
                        }
                    }.bind(this), 100);
                

            }

        }
    }

/* page handler */
    App.pages.landing = function(element) {

        return {

            element: element,
            elements: new Object(),
            sections: {
                WalletFormView: new App.form(App.setElement({ tag: "section", class: "wallet form-view" })),
                TransactionFormView: new App.form(App.setElement({ tag: "section", class: "transactions form-view" }))
            },

            init: function() {

                this.sections.WalletFormView.init();
                this.sections.TransactionFormView.init();

                App.addElements([
                    this.sections.WalletFormView.element,
                    this.sections.TransactionFormView.element
                ], this.element);

                return true;

            }

        }

    }

/* onload page handler */
    App.loads.page = function(element = App.getElement(".page-view")) {
        let handler, name;

        /* checking page element and get its name */
            if(App.isElement(element)) {
                name = element.className.split(" ");

                /* checking page name */
                    if(App.getLength(name) > 1) {
                        name = name[0];
                        
                        /* initiate handler if exist */
                            if(App.isFunction(App.pages[name])) {
                                handler = new App.pages[name](element);
                            }
                    }
            }
        
        /* calling init */
            if(App.isObject(handler)) {
                return handler.init();
            }
        
        if(App.debug) {
            console.warn("App.loads.page missing handler: no handler found of page named ", name);
            console.log(element);
        }
        return false;
    }

/* window onload */
    window.onload = function() {

        /* initializing variable */
            App.url = App.getElement("meta[name=baseurl]").content + "/";

        /* initialzing handler */
            App.Request = new App.Request();
            App.Data = new App.Data();

        /* fetching on load functions */
            App.fetchObject(App.loads, function(x, load) {
                if(App.isFunction(load)) load();
            });

    }