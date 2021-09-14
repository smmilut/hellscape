/*
    # Entities

    The global object `Entities` holds all Entities.
    It can spawn Entities with `Entities.spawn()`

    ## Entity

    Each Entity holds its own Components.
    You can add "someComponent" to "someEntity" with `someEntity.addComponent(someComponent)`

    # Components

    ## Components API

    ```
    Component_Something = {
        name,
    }
    ```

    Basically any object that has a `.name` property can be a Component.

    ## Add a new Component to an Entity

    To add a new Component to an Entity, you must first access that Entity, and do :
    ```
    someEntity.addComponent(someComponent);
    ```

    Usually, during setup with :
    ```
    Entities.spawn()
        .addComponent(someComponent1)
        .addComponent(someComponent2)
        .addComponent(someComponent3)
    ```
*/

/*
*   Entity template object
*/
const Entity = {
    init: function Entity_init() {
        this.components = [];
        return this;
    },

    addComponent: function Entity_addComponent(component) {
        this.components.push(component);
        return this;
    },

    hasComponent: function Entity_hasComponent(componentName) {
        return this.components.some(function verifyComponent(component) {
            return component.name == componentName;
        }.bind(this));
    },

    hasAllComponents: function Entity_hasAllComponents(componentNames) {
        return componentNames.every(function checkQueryComponent(componentName) {
            return this.hasComponent(componentName);
        }.bind(this));
    },

    getComponents: function Entity_getComponents(componentName) {
        return this.components.filter(function filterComponent(component) {
            return component.name == componentName;
        }.bind(this));
    },
};

/*
*   Instantiate an Entity
*/
function newEntity() {
    const entity = Object.create(Entity);
    entity.init();
    return entity;
}

/*
*   Manage Entities
*/
export const Entities = (function build_Entities() {
    const obj_Entities = {};

    obj_Entities.init = function Entities_init() {
        obj_Entities.storage = [];
    };

    obj_Entities.spawn = function Entities_spawn() {
        const entity = newEntity()
        obj_Entities.storage.push(entity);
        return entity;
    };

    /*
    *   Query Entities with a list of Components names ["component1", "component2", ...]
    *   Get a list of "matches", only for Entities that match ALL queried Components :
    *   [
    *       {  // Entity match "A"
    *           "component1": component1,
    *           "component2": component2,
    *           ...
    *       },
    *       {  // Entity match "B"
    *           "component1": component1,
    *           "component2": component2,
    *           ...
    *       },
    *       ...
    *   ]
    */
    obj_Entities.queryComponents = function Entities_queryComponents(componentQuery) {
        let result = [];
        for (const entity of obj_Entities.storage) {
            if (entity.hasAllComponents(componentQuery)) {
                // this Entity is valid for the query, get all Components
                const resultComponents = {};
                for (let queriedComponentName of componentQuery) {
                    // take the 1st one only, don't expect several Components with the same name
                    let resultComponent = entity.getComponents(queriedComponentName)[0];
                    resultComponents[queriedComponentName] = resultComponent;
                }
                result.push(resultComponents);
            }
        }
        return result;
    };

    return obj_Entities;
})();

/*
*   Initialize system : make user system Resources available
*/
export async function init() {
    await Entities.init();
}
