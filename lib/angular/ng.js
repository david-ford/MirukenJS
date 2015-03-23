var miruken = require('../miruken.js');

new function () { // closure

    if (typeof angular === 'undefined') {
        throw new Error("angular not found.  Did you forget to include angular.js first?");
    }

    /**
     * @namespace miruken.ng
     */
    var ng = new base2.Package(this, {
        name:    "ng",
        version: miruken.version,
        parent:  miruken,
        imports: "miruken,miruken.callback,miruken.context,miruken.ioc,miruken.ioc.config,miruken.mvc",
        exports: "bootstrap,rootContext"
    });

    eval(this.imports);

    var rootContext   = new Context,
        rootContainer = new IoContainer;

    /**
     * @function bootstrapMiruken
     * Bootstraps angular with Miruekn.
     * @param  {Object}  options  - bootstrap options
     */
    function bootstrap(options) {
        var ngModule = angular.module;
        ngModule('ng').config(_configureRootContext)
                      .run(['$rootScope', _instrumentScopes]);
        _provideInjector(rootContainer, angular.injector(['ng']));
        angular.module = function (name, requires, configFn) {
            var module = ngModule.call(this, name, requires, configFn);
            if (requires) {
                var injector = angular.injector([name]),
                    package  = _autoSynthesizeModulePackage(name, injector);
                module.config(['$injector', '$controllerProvider', function ($injector, $controllerProvider) {
                    _installPackage(package, $injector, $controllerProvider);
                }]);
            }
            return module;
        };
    }

    /**
     * @function _configureRootContext
     * Configures the root context and installs root container.
     */
    function _configureRootContext() {
        rootContext.addHandlers(rootContainer, 
                                new miruken.validate.ValidationCallbackHandler,
                                new miruken.error.ErrorCallbackHandler);
    }

    /**
     * @function _instrumentScopes
     * Instruments angular scopes with miruken contexts.
     * @param  {Scope}   $rootScope  - angular's root scope
     */
    function _instrumentScopes($rootScope)
    {
        var scopeProto   = $rootScope.constructor.prototype,
            newScope     = scopeProto.$new,
            destroyScope = scopeProto.$destroy;
        scopeProto.$new = function (isolate, parent) {
            var childScope  = newScope.call(this, isolate, parent),
                parentScope = childScope.$parent;
            childScope.context = parentScope && parentScope.context
                               ? parentScope.context.newChild()
                               : new Context;
            $provide(childScope.context, "$scope", childScope);
            return childScope;
        };
        scopeProto.$destroy = function () {
            var context = this.context;
            if (context !== rootContext) {
                delete this.context;
                context.end();
            }
            destroyScope.call(this);
        };
        $rootScope.rootContext = $rootScope.context = rootContext;
    }

    /**
     * @function _autoSynthesizeModulePackage
     * Synthesizes Miruken packages from angular modules.
     * @param    {String}   moduleName  - module name
     * @param    {Injector} injector    - module injector
     * @returns  {Package}  the corresponding package.
     */
    function _autoSynthesizeModulePackage(moduleName, injector) {
        var parent = base2,
            names  = moduleName.split(".");
        for (var i = 0; i < names.length; ++i) {
            var packageName = names[i],
                package     = parent[packageName];
            if (!package) {
                package = new base2.Package(null, {
                    name:   packageName,
                    parent: parent
                });
                parent.addName(packageName, package);
                if (parent === base2) {
                    global[packageName] = package;
                }
            }
            parent = package;
        }
        _provideInjector(rootContainer, injector);
        return package;
    }

    /**
     * @function _installPackage
     * Install the package with Installers and Controllers.
     * @param  {Package}   package              - module package
     * @param  {Injector} injector              - module injector
     * @param  {Provider}  $controllerProvider  - controller provider
     */
    function _installPackage(package, injector, $controllerProvider) {
        var container = Container(rootContext);
        package.getClasses(function (member) {
            var clazz = member.member;
            if (clazz.prototype instanceof Controller) {
                $controllerProvider.register(member.name, 
                    ['$scope', '$injector', _controllerShim(clazz)]);
                container.register($component(clazz).contextual());
            } else if (clazz.prototype instanceof Installer) {
                var register = (clazz.prototype.$inject || clazz.$inject || []).slice();
                register.push(function () {
                    var installer = clazz.new.apply(clazz, Array.prototype.slice.call(arguments));
                    container.register(installer);
                });
                injector.invoke(register);
            }
        });
        package.getPackages(function (member) {
            _installPackage(member.member, injector, $controllerProvider);
        });
    }

    /**
     * @function _controllerShim
     * Registers the controller from package into the container and module.
     * @param    {Function}  controller  - controller class
     * @returns  {Function}  controller constructor shim.  
     */
    function _controllerShim(controller) {
        return function($scope, $injector) {
            var context = $scope.context;
            _provideInjector(context, $injector);
            var instance = context.resolve($instant(controller));
            if (instance) {
                instance.setContext(context);
            }
            return instance;
        };
    }

    function _provideInjector(owner, $injector) {
        $provide(owner, null, function (resolution) {
            var key = Modifier.unwrap(resolution.getKey());
            if ($isString(key)) {
                return $injector.get(key);
            }
        });
    }

    eval(this.exports);
}