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

    constructor(debug=false, super_debug=false) {
        this.formInstances = {} // Stores all the form instances created
        this.themes = {} // Stores all the themes used for building fields
        this.fields = {} // Stores all the configuration for fields
        this.DEBUG = (debug || super_debug) ? true : false // Sets debug info
        this.SUPER_DEBUG = (super_debug) ? true : false

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
    registerTheme(name, fieldClasses, feedbackClasses, controlClasses, additionalParams=null) {
        // name = the theme name (used to call the theme back when building a form)
        // fieldClasses = {PerField, PerFieldWrapper, Valid, Invalid, ...} the classes used for building a field
        // feedbackClasses = {Valid, Invalid, ...} the classes used for field feedback
        // controlClasses = {SubmitBtn, ...} the classes used for controls
        // additionalParams = {anything} used for any additional info about the theme
        this.themes[name] = {
            fieldClasses,
            feedbackClasses,
            controlClasses,
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
        // getValue(formInstance, fieldConfig) => return the field value, if any

        // onUpdate (function, optional) = the function to call when the field value changes
        // onUpdate(formInstance, fieldName, value) => no return required
        
        // onValidate (function, optional) = the function to allow the registrar validate an input
        // onValidate(formInstance, fieldName, value) => return {isValid: boolean, message: string}

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
        this._debugMsg(`Creating field '${fieldId}' in '${formId}': `, config)

        // Create fields
        if (fieldType in this.fields) {
            try {
                // If in debug: show raw JSON
                if (this.SUPER_DEBUG) {
                    html = `<details class="col-12"><summary style="opacity: 0.5" class="font-decoration-italics">'${fieldId}' (${fieldType})</summary><pre style="opacity: 1">${JSON.stringify(config, null, 2)}</pre></details>`
                }

                const onCreate = this.fields[fieldType].onCreate
                html += onCreate(formInstance, config)
            } catch(e) {
                this._errorMsg(`Creating field in '${formId}' failed! Config:`, config, 'Error:', e)

                // Show message in DOM if in debug mode
                if (this.DEBUG) {
                    html = `
                    <div class="col-12"><details><summary><strong>Error while creating field: ${fieldId} (${fieldType}).</strong></summary>This is only shown in debug mode.<pre>${JSON.stringify(config, null, 2)}</pre></div>
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

    // Get field value
    _getFieldValue(formInstance, config) {
        const formId = formInstance.id
        const formElem = document.getElementById(formId)
        const fieldType = config.type
        const fieldId = config.id

        this._debugMsg(`Getting field '${fieldId}' (${fieldType}) value`)

        // Verify field is registered
        if (!(fieldType in this.fields)) {
            this._errorMsg(`Get field value failed: Unknown type ${fieldType} for '${fieldId}'`)
            return null
        }

        const getValue = this.fields[fieldType].getValue
        return getValue(formInstance, config)
    }

    // Perform field validation
    _validateFieldValue(formInstance, config, value) {
        const formId = formInstance.id
        const formElem = document.getElementById(formId)
        const fieldType = config.type
        const fieldId = config.id

        this._debugMsg(`Validating field '${fieldId}' (${fieldType}) value`)

        // Verify field is registered
        if (!(fieldType in this.fields)) {
            this._errorMsg(`Validate field value failed: Unknown type ${fieldType} for '${fieldId}'`)
            return null
        }

        const onValidate = this.fields[fieldType].onValidate
        return onValidate(formInstance, config, value)
    }

    // Create form
    createForm(formId, formName, config, dataHandler=this.unknownDataHandler.bind(this)) {
        this._debugMsg(`Creating form with name '${formName}:'`, config)
        this.formInstances[formName] = {
            id: formId,
            htmlFormId: formId + "-JsonForm",
            name: formName,
            dataHandler,
            config
        }
        const formInstance = this.formInstances[formName]

        // Create DOM
        const formWrapper = document.getElementById(formId)
        if (!formWrapper) {
            this._errorMsg(`Element not found with #${formId}`)
            return
        }
        formWrapper.innerHTML = ""
        // Check if form is a <form> tag
        if (formWrapper.tagName != "FORM") {
            this._errorMsg(`Element '${formId}' is not a form.`)
            if (this.SUPER_DEBUG) {
                formWrapper.innerHTML = `<p style="color: red; background: white;">JsonForm Error: This (#${formId} - ${formWrapper.tagName}) element is not a form tag. You are seeing this because SUPER_DEBUG is enabled.</p>`
            }
            return
        }

        // Enable BS row system
        formWrapper.classList.add("row")

        // Create fields
        if (!config.fields) return this._errorMsg("Create Form failed: Form is missing the 'fields' key in configuration.")
        let detectedSubmitBtn = false
        for (const fieldIndex in config.fields) {
            const field = config.fields[fieldIndex]
            const fieldId = `${formId}-${field.id}`
            this._createField(formInstance, field)

            // Handle speciality types
            switch(field.type) {
                // Detect if we created a submit button
                case "button":
                    if (field.config.type != "submit") break
                    detectedSubmitBtn = true
                    break
            }
        }

        // Create submit button, if it wasn't done automatically
        // TODO: Maybe controlled by root config key in the future?
        this._debugMsg("Detected a submit button during form build?", detectedSubmitBtn)
        if (!detectedSubmitBtn) {
            this._createField(formInstance, {
                id: "submit_button",
                type: "submit_button", 
            })
        }
        
        // Add submit handler
        formWrapper.addEventListener("submit", (e) => {
            e.preventDefault();
            this.submitForm(formName);
            return false;
        })
    }

    // Gathers form data
    gatherFormData(formName) {
        const formInstance = this.formInstances[formName]
        if (!formInstance) { 
            return this._errorMsg(`Gathering form data failed: Unknown form '${formName}'`)
        }

        // Cycle through all fields and get values
        if (!config.fields) return this._errorMsg(`Gathering form data failed: No fields for '${formName}'`)

        let formData = {}
        for (const fieldIndex in config.fields) {
            const field = config.fields[fieldIndex]
            const fieldId = field.id

            const fieldValue = this._getFieldValue(formInstance, field)
            formData[fieldId] = fieldValue
        }

        return formData
    }

    // Validate form data
    validateFormData(formName, formData) {
        const formInstance = this.formInstances[formName]
        if (!formInstance) { 
            return this._errorMsg(`Validating form data failed: Unknown form '${formName}'`)
        }

        // Cycle through all fields and validate here & within the field registrar
        if (!config.fields) return this._errorMsg(`Validating form data failed: No fields for '${formName}'`)

        // Some special notes here:
        // 'undefined' in formdata = No support for getting a value (such as text elements)
        // '' or 'null' in formdata = No response, but valid for getting a value

        let validationStates = {}
        let formValid = true
        for (const fieldIndex in config.fields) {
            const field = config.fields[fieldIndex]
            const fieldId = field.id

            const value = formData[fieldId]

            if (value === undefined) continue // Skips undefined data

            var isValid = false
            var message = "No validation was performed"
            //
            // PERFORM LOCAL VALIDATION HERE
            //

            // Pass to field registrar to perform it's own validation (if necessary)
            const registrarValidationState = this._validateFieldValue(formInstance, field, value)
            if (!registrarValidationState.isValid) {
                isValid = false
                message = registrarValidationState.message
            }

            // Update data
            validationStates[fieldId] = {isValid, message}
            this._debugMsg(`Field '${fieldId}' in form '${formName}' validated: Valid? ${isValid}: ${message}`)
            // Set form validation status
            if (!isValid) formValid = false

            // Update UI
            // TODO
        }

        this._debugMsg(`Form ${formName} validated: Valid? ${isValid}`)
        return {valid: formValid, validationStates}
    }

    // Perform form "submit"
    submitForm(formName) {
        const formInstance = this.formInstances[formName]
        // Gather
        const formData = this.gatherFormData(formName)
        // Validate
        const validate = this.validateFormData(formName, formData)
        // Give back
        formInstance.dataHandler(formInstance, validate.valid, formData)
    }

    // Handle unknown data handler
    unknownDataHandler(formInstance, valid, data) {
        const formName = formInstance.name

        this._errorMsg(`Form '${formName}' has no registered data handler for form submission.`)
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

    constructor(debug=false, super_debug=false) {
        this.JsonForm = new JsonForm(debug, super_debug)
        this.DEBUG = this.JsonForm.DEBUG // Inherits debug flag from jsonform
        this._debugMsg("Debugging is enabled.")

        // Add wrappers
        this.createForm = (...args) => { this.JsonForm.createForm(...args) }

        // Initialize 
        this.registerFields()
        this.registerTheme()
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
        const fields = ["text", "link", "button", "input", "checkbox", "radio", "select", "switch", "submit_button"]
        this._debugMsg("Registering these fields:", fields)
        fields.forEach((fieldName) => {
            this.JsonForm.registerField(fieldName, this._fieldOnCreate.bind(this), this._fieldGetValue.bind(this), this._fieldOnUpdate.bind(this), this._fieldOnValidate.bind(this))
        })
    }

    // Registers the theme
    registerTheme() {
        // Normal size BS4 theme
        this.JsonForm.registerTheme("BS4", 
        { // Field
            wrapperClasses: "mb-2",
            inputClasses: "mb-2"
        }, 
        { // Feedback
            muted: "text-muted"
        },
        { // Control
            submitBtnClasses: "btn btn-primary w-100 mb-n2 mt-2"
        })

        // Some specific compact options
        this.JsonForm.registerTheme("BS4_compact", 
        { // Field
            wrapperClasses: "mb-1",
            inputClasses: "mb-1"
        },
        { // Feedback
            muted: "text-muted"
        },
        { // Control
            submitBtnClasses: "btn btn-primary w-100 mb-n3 mt-1"
        })
    }

    // Handles creation of a field
    _fieldOnCreate(formInstance, fieldPayload) {
        const formId = formInstance.id
        const fieldId = `${formId}-${fieldPayload.id}`
        const config = fieldPayload.config
        const themeName = formInstance.config.use_bs4_compact_theme ? "BS4_compact" : "BS4"
        const theme = this.JsonForm.getTheme(themeName)
        let colSize = 12
        this._debugMsg(`Creating field for form ${formId} - Payload:`, fieldPayload)

        // Determine width
        if (fieldPayload.width) {
            const width = fieldPayload.width
            // Make sure width is greater than or equal to 1 and less than or equal to 12
            // ... to match BS limits
            if (1 <= width <= 12) {
                colSize = width
            }
        }

        // Determine what template to use
        let template = `<div class="${theme.fieldClasses.wrapperClasses} col-${colSize}">`;
        let sublabel;
        switch (fieldPayload.type) {
            // Text elements
            case "text":
                template += `<${config.element} class="${config.classes}">${config.content}</${config.element}>`
                break

            // Link elements
            case "link":
                template += `<a href="${config.url}" class="${config.classes}">${config.content}</a>`
                break

            // Button elements
            case "button":
                template += `<button id="${fieldId}" type="${config.type}" class="${config.classes}">${config.content}</button>`
                break

            // Speciality button: Submit
            case "submit_button":
                template += `<button id="${fieldId} type="submit" class="${theme.controlClasses.submitBtnClasses}">Submit</button>`
                break
                
            // Input fields
            case "input":
                template += `<div class='form-group ${theme.fieldClasses.inputClasses}'>`

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
                break

            // Checkbox
            case "checkbox":
                // Handle sublabel
                if (config.sublabel) {
                    sublabel = `<br /><span class='${theme.feedbackClasses.muted}'>${config.sublabel}</span>`
                }

                // Build actual checkbox dom
                template += `
                <div class="custom-control custom-checkbox">
                    <input type="checkbox" class="custom-control-input" id="${fieldId}">
                    <label class="custom-control-label" for="${fieldId}">${config.label}${sublabel}</label>
                </div>
                `
                break

            // Switch
            case "switch":
                // Handle sublabel
                if (config.sublabel) {
                    sublabel = `<br /><span class='${theme.feedbackClasses.muted}'>${config.sublabel}</span>`
                }

                // Build switch
                template += `
                <div class="custom-control custom-switch">
                    <input type="checkbox" class="custom-control-input" id="${fieldId}">
                    <label class="custom-control-label" for="${fieldId}">${config.label}${sublabel}</label>
                </div>`
                break
        }
        template += `</div>`

        return template
    }

    // Handles getting a field value
    _fieldGetValue(formInstance, fieldPayload) {
        const formId = formInstance.id
        const fieldId = `${formId}-${fieldPayload.id}`
        const fieldIdAsElem = document.getElementById(fieldId)
        const config = fieldPayload.config

        this._debugMsg(`Getting field value: '${fieldId}' from form '${formId}'`, fieldPayload, formInstance)

        // Gather the field value
        let value = undefined;
        switch (fieldPayload.type) {
            // Handle inputs
            case "input":
                value = fieldIdAsElem.value
                break
            // Handle checkboxes & switches
            case "switch":
            case "checkbox":
                value = fieldIdAsElem.checked
                break
        }

        this._debugMsg(`Field '${fieldId}' = '${value}' in form '${formId}'`)
        return value
    }

    // Handles validating a field value
    _fieldOnValidate(formInstance, fieldPayload, value) {
        const formId = formInstance.id
        const fieldId = `${formId}-${fieldPayload.id}`
        const fieldIdAsElem = document.getElementById(fieldId)
        const config = fieldPayload.config

        this._debugMsg(`Validating field value: '${fieldId}' = '${value}' from form '${formId}'`, fieldPayload, formInstance)

        // Validate the value
        let isValid = false
        let message = "No validation was performed"
        switch (fieldPayload.type) {
            // Handle non-data specific ones
            case "text":
            case "link":
                isValid = true
                message = "Unsupported"
                break;
            // Handle inputs
            case "input":
                isValid = true
                message = "To be implemented"
                break
            // Handle checkboxes & switches
            case "switch":
            case "checkbox":
                isValid = true
                message = "To be implemented"
                break
        }

        this._debugMsg(`Validated Field '${fieldId}' = '${value}' in form '${formId}'. Valid? ${isValid}: ${message}`)
        return {isValid, message}
    }

    // Handles a field value changing
    _fieldOnUpdate(formInstance, fieldName, value) {
        this._debugMsg(`Updating field value: '${fieldName}' => ${value} from form '${formInstance}'`)
    }

}