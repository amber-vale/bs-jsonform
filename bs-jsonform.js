/*
    bs-jsonform v2
    https://github.com/ambersnow/bs-jsonform

    This is the V2 rebuild to:
    * No more jQuery requirement
    * More field flexibility
    * More built-in functionality
    * Field API for custom fields
*/

class JsonForm {

    constructor(debug=false) {
        this.formInstances = {} // Stores all the form instances created
        this.themes = {} // Stores all the themes used for building fields
        this.fields = {} // Stores all the configuration for fields
        this.DEBUG = (debug) ? true : false // Sets debug info

        this._debugMsg("Debugging is enabled.")
    }

    // Some helper functions for making pretty console messages
    _debugMsg(...msg) {
        if (!this.DEBUG) return
        console.log("%c[jsonform] %c[DEBUG]", "color:orange", "color:lightblue", ...msg)
    }
    _infoMsg(...msg) {console.log("%c[jsonform] %c[INFO]", "color:orange", "color:green", ...msg)}
    _errorMsg(...msg) {console.log("%c[jsonform] %c[ERROR]", "color:orange", "color:red", ...msg)}

    // Register custom theme
    registerTheme(name, fieldClasses, feedbackClasses, additionalParams=null) {
        // name = the theme name (used to call the theme back when building a form)
        // fieldClasses = {PerField, PerFieldWrapper, Valid, Invalid, ...} the classes used for building a field
        // feedbackClasses = {Valid, Invalid, ...} the classes used for field feedback
        // additionalParams = {anything} used for any additional info about the theme
        this.themes[name] = {
            FieldClasses: fieldClasses,
            FeedbackClasses: feedbackClasses,
            ...additionalParams
        }
        this._debugMsg("Registered theme:", name, "Config:", this.themes[name])
    }

    // Get theme by name
    getTheme(name) {
        // name = theme name
        return this.themes[name]
    }

    // Register field
    registerField(name, onCreate, getValue=null, onUpdate=null, onValidate=null) {
        // name (string) = field name (eg: selectUser)
        
        // onCreate (function) = the function to call to create the field
        // onCreate(formInstance, fieldConfig) => return the html for the field
        
        // getValue (function) = the function used to get the field value
        // getValue(formInstance, fieldName) => return the value of the field

        // onUpdate (function, optional) = the function to call when the field value changes
        // onUpdate(formInstance, fieldName, value) => no return required
        
        // onValidate (function, optional) = the function to help validate an input
        // onValidate(formInstance, fieldName, value) => return {valid: boolean, message: string}

        this.fields[name] = {
            onCreate,
            getValue,
            onUpdate,
            onValidate
        }

        this._debugMsg("Registered field:", name, "Config:", this.fields[name])
    }

    // Create field
    _createField(formInstance, config) {
        const formId = formInstance.id
        const formElem = document.getElementById(formId)
        const fieldType = config.type
        const fieldId = config.id
        let html = ""
        this._debugMsg(`Creating field in '${formId}': `, config)

        // Create fields
        if (fieldType in this.fields) {
            try {
                const onCreate = this.fields[fieldType].onCreate
                html = onCreate(formInstance, config)
            } catch(e) {
                this._errorMsg(`Creating field in '${formId}' failed! Config:`, config, 'Error:', e)

                // Show message in DOM if in debug mode
                if (this.DEBUG) {
                    html = `
                    <div><details><summary><strong>Error while creating field: ${fieldId} (${fieldType}).</strong></summary>This is only shown in debug mode.<pre>${JSON.stringify(config, null, 2)}</pre></div>
                    `
                }
            }

            formElem.insertAdjacentHTML("beforeend", html)
            return
        }

        // Show message in DOM if in debug mode
        if (this.DEBUG) {
            html = `
            <div style="padding: 15px 5px;"><details><summary><strong>Unknown field: ${fieldId} (${fieldType}).</strong></summary>This is only shown in debug mode.<pre>${JSON.stringify(config, null, 2)}</pre></div>
            `
        }
        formElem.insertAdjacentHTML("beforeend", html)
        this._infoMsg(`Unknown field type in '${formId}': ${fieldType}. Skipping. Config:`, config)
    }

    // Create form
    createForm(formId, formName, config) {
        this._debugMsg(`Creating form with name '${formName}:'`, config)
        this.formInstances[formName] = {
            id: formId,
            name: formName,
            original_config: config
        }
        const formInstance = this.formInstances[formName]

        // Create DOM
        const formWrapper = document.getElementById(formId)
        if (!formWrapper) {
            this._errorMsg(`Element not found with #${formId}`)
            return
        }

        // Create fields
        if (!config.fields) return this._errorMsg("Create Form failed: Form is missing the 'fields' key in configuration.")
        for (const fieldIndex in config.fields) {
            const field = config.fields[fieldIndex]
            this._createField(formInstance, field)
        }
    }

}

/*
    Bootstrap 4 Theme for jsonform v2 
    https://github.com/ambersnow/bs-jsonform

    This "BS4_JsonForm" class is the wrapper around the JsonForm class but supplies the BS4 theming & field support.
    This provides an example for how you could write your own bs-jsonform custom fields/theming. 
    Or if you use BS4 in your application then it is all ready to go.
*/
class BS4_JsonForm {


    constructor(debug=false) {
        this.JsonForm = new JsonForm(debug)
        this.DEBUG = this.JsonForm.DEBUG // Inherits debug flag from jsonform
        this._debugMsg("Debugging is enabled.")

        // Add wrappers
        this.createForm = (...args) => { this.JsonForm.createForm(...args) }

        // Initialize 
        this.registerFields()
    }

    // Some helper functions for making pretty console messages
    _debugMsg(...msg) {
        if (!this.DEBUG) return
        console.log("%c[bs4-jsonform] %c[DEBUG]", "color:pink", "color:lightblue", ...msg)
    }
    _infoMsg(...msg) {console.log("%c[bs4-jsonform] %c[INFO]", "color:pink", "color:green", ...msg)}
    _errorMsg(...msg) {console.log("%c[bs4-jsonform]", "color:pink", "%c[ERROR]", "color:red", ...msg)}


    // Register fields for BS4
    registerFields() {
        const fields = ["text", "button", "input", "checkbox", "radio", "select"]
        this._debugMsg("Registering these fields:", fields)
        fields.forEach((fieldName) => {
            this.JsonForm.registerField(fieldName, this._fieldOnCreate.bind(this), this._fieldGetValue.bind(this), this._fieldOnUpdate.bind(this), this._fieldOnValidate.bind(this))
        })
    }

    // Handles creation of a field
    _fieldOnCreate(formInstance, fieldPayload) {
        const formId = formInstance.id
        const fieldId = `${formId}-${fieldPayload.id}`
        const config = fieldPayload.config
        this._debugMsg(`Creating field for form ${formId} - Payload:`, fieldPayload)

        switch (fieldPayload.type) {
            // Text elements
            case "text":
                var template = `<${config.element} classes="${config.classes}">${config.content}</${config.element}>`
                return template

            // Button elements
            case "button":
                var template = `<button type="${config.type}" class="${config.classes}">${config.content}</button>`
                return template
                
            // Input fields
            case "input":
                var template = `<div class='form-group'>`

                // Above field elements
                // If label:
                if (config.label) template += `<label for="${fieldId}">${config.label}</label>`
                // If placeholder
                const placeholder = (config.placeholder) ? config.placeholder : ""

                //// Field itself
                const fieldSubtype = (config.subtype) ? config.subtype : "text"
                template += `<input type="${fieldSubtype}" placeholder="${placeholder}" class="form-control" id="${fieldId}" aria-describedby="${fieldId}-sublabel">`

                //// Below field elements
                // If sublabel 
                if (config.sublabel) template += `<small id="${fieldId}-sublabel" class="form-text text-muted">${config.sublabel}</small>`

                template += `</div>`
                return template
        }
    }

    // Handles getting a field value
    _fieldGetValue(formInstance, fieldName) {
        this._debugMsg(`Getting field value: '${fieldName}' from form '${formInstance}'`)
    }

    // Handles a field value changing
    _fieldOnUpdate(formInstance, fieldName, value) {
        this._debugMsg(`Updating field value: '${fieldName}' => ${value} from form '${formInstance}'`)
    }

    // Handles a field being validated
    _fieldOnValidate(formInstance, fieldName) {
        this._debugMsg(`Validating field: '${fieldName}' from form '${formInstance}'`)
    }

}