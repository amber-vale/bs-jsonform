// Builds Bootstrap 4 forms based on JSON

class JsonForm {

    constructor() {
        this.formInstances = {}
    
        // Classes to use for these forms
        this.formClasses = {
            Form: "bs-jsonform",
            Input: {
                Group: "form-group",
                Class: "form-control",
                isValid: "is-valid",
                isInvalid: "is-invalid"
            },
            Feedback: {
                isValid: "valid-feedback",
                isInvalid: "invalid-feedback"
            }
        }

        // Make sure we don't already have multiple instances running
        if (window) {
            if(!window.JsonForm) {
                window.JsonForm = true
            } else {
                throw "You cannot run more than one instance of JsonForm."
            }
        }
    }

    create(parent, json, instance="default") {
        this._initializeForm(parent, instance)
        this._buildForm(json, instance)
        this._setState("ready", instance)
    }

    registerSubmit(callback, instance="default") {
        if (!(instance in this.formInstances)) {
            console.error("Instance ("+instance+") does not exist.")
            return false
        }

        this.formInstances[instance].SubmitHandler = callback
    }

    // Initializes the form body
    // parent: parent ID
    // instance: the form instance, as lived in this.formInstances
    _initializeForm(parent, instance="default") {
        var Parent = $(parent)
        if(Parent == undefined) {
            console.error("Parent "+parent+" not found")
            return False
        }

        // Make sure that this instance doesn't already exist
        if ((instance in this.formInstances)) {
            console.error("Cannot initialize on already initialized instance ("+instance+"). Use JsonForm.destroy('"+instance+"') to release this instance.")
        }

        var template = `
            <form id="JsonForm-`+instance+`" x-instance="`+instance+`" class="`+this.formClasses.Form+`">
                <div id="JsonForm-`+instance+`-Loader" style="display: none"></div>
                <div id="JsonForm-`+instance+`-Body" style="display: none"></div>
                <div id="JsonForm-`+instance+`-Controls" style="display: none"></div>
            </form>
        `

        Parent.append(template)

        this.formInstances[instance] = {
            FormID: "#JsonForm-"+instance,
            LoaderID: "#JsonForm-"+instance+"-Loader",
            BodyID: "#JsonForm-"+instance+"-Body",
            ControlsID: "#JsonForm-"+instance+"-Controls",
            SubmitHandler: (e, d) => {console.warn("Unhandled submit event on Form instance "+instance);console.log(e, d)}
        }

        $("#JsonForm-"+instance).submit((e) => {
            e.preventDefault()
            this._submitForm(instance)
        })
    
        return "#JsonForm-"+instance
    }
    
    // Handles building the form fields
    // json: json payload
    // instance: the form instance
    _buildForm(json, instance="default") {
        if(!(instance in this.formInstances)) {
            console.error("Instance "+instance+" has not been initialized")
        }

        var formInstance = this.formInstances[instance]
        
        // For each item in the JSON, trigger the _buildField based on field.type
        json.fields.forEach((field, index) => {
            if (!('type' in field)) {
                console.error("Field lacks a 'type' in payload", field)
                return
            }

            if (field.type == "field") {
                // Make sure field is in field
                if(!('field' in field)){
                    console.error("Field lacks a 'field' property when using type=field")
                    return
                }

                this._buildField(field, instance)
            }

            if (field.type == "html") {
                // Make sure HTML property is in field
                if(!('html' in field)){
                    console.error("Field lacks a 'html' property when using type=html")
                    return
                }

                $(formInstance.BodyID).append(field.html)
            }
        })

        if (!("submit_button_text" in json)){
            json.submit_button_text = "Submit"
        }

        if (!("cancel_button_text" in json)){
            json.cancel_button_text = "Cancel"
        }

        if (!("hide_validation" in json)){
            json.hide_validation = true
        }

        this.formInstances[instance].JSON = json

        if(("form_controls_id" in json)) {
            this.formInstances[instance].ControlsID = json.form_controls_id
        }

        // Build form controls
        var controls = `
        <div class="float-right mt-3">
            <button type="submit" class="btn btn-primary">`+json.submit_button_text+`</button>
        </div>`
        $(this.formInstances[instance].ControlsID).html(controls)

    }

    // Handles building a form field
    // json: json payload
    // instance: the form instance
    _buildField(json, instance="default") {
        if(!(instance in this.formInstances)) {
            console.error("Instance "+instance+" has not been initialized.")
        }

        var formInstance = this.formInstances[instance]

        if (!("Fields" in formInstance)) {
            this.formInstances[instance]["Fields"] = {}
        }

        this.formInstances[instance]["Fields"][json.id] = json

        var json = this._padFieldJson(json)

        var id = "JsonForm-"+instance+"-Input-"+json.id
        var template = ``

        // Build DOM
        switch (json.field.type) {
            // Generate switch
            case "switch":
                var isChecked = ""
                if (json.field.default_value == "checked" || json.field.default_value 
                == "true" || json.field.default_value == "selected") {
                    isChecked = "checked"
                }
                template = `
                <div class="custom-control custom-switch mt-3">
                    <input type="checkbox" class="custom-control-input" id="`+id+`" `+isChecked+`>
                    <label class="custom-control-label" for="`+id+`">`+json.name+`</label>
                </div>
                `
                break
            // Generate checkboxes
            case "checkbox":
                var isChecked = ""
                if (json.field.default_value == "checked" || json.field.default_value 
                == "true" || json.field.default_value == "selected") {
                    isChecked = "checked"
                }
                template = `
                <div class="custom-control custom-checkbox mt-3">
                    <input type="checkbox" class="custom-control-input" id="`+id+`" `+isChecked+`>
                    <label class="custom-control-label" for="`+id+`">`+json.name+`</label>
                </div>
                `
                break
            // Generate radios
            case "radio":
                template = `<div class="mt-3"><p class="mb-2 mt-0" id="`+id+`">`+json.name+`</p>`

                json.field.options.forEach((item, index) => {
                    var isSelected = ""
                    if (json.field.default_value == item) {
                        isSelected = "checked"
                    }
                    template += `
                    <div class="custom-control custom-radio">
                        <input type="radio" id="`+id+index+`" name="`+id+`" value="`+item+`" class="custom-control-input" `+isSelected+`>
                        <label class="custom-control-label" for="`+id+index+`">`+item+`</label>
                    </div>`
                })

                template += "</div>"

                break
            // Generate select
            case "select":
                template = `
                <div class="mt-3">
                    <p class="mb-2 mt-0">`+json.name+`</p>
                    <select class="custom-select" id="`+id+`">    
                `

                json.field.options.forEach((item, index) => {
                    var isSelected = ""
                    if (json.field.default_value == item) {
                        isSelected = "selected"
                    }
                    template += `
                    <option `+isSelected+` value="`+item+`">`+item+`</option>`
                })

                template += "</select></div>"

                break
            case "file":
                template = `
                <div class="custom-file">
                    <input type="file" class="custom-file-input" id="`+id+`">
                    <label class="custom-file-lanobel" for="`+id+`">Choose file</label>
                </div>
                `
            // Otherwise do a normal input
            default:
                template = `
                <div class="form-group">
                    <label for="`+id+`">`+json.name+`</label>
                    <input type="`+json.field.type+`" class="form-control" id="`+id+`" placeholder="`+json.field.placeholder+`" value="`+json.field.default_value+`">
                </div>
                `
        }
        
        $(formInstance.BodyID).append(template)
        this._prepInput("#"+id)

        // If it is marked as readonly, disable input
        if(json.field.readonly){
            this._disableInput("#"+id)
        }

        // Handle field update handlers
        if(json.field.type !== "radio") {
            // Register event handlers
            $("#"+id).change(() => {
                this._validateField(json.id, instance)
            })
        } else {
            // Radios need a special handler
            $("input[name=\""+id+"\"]").change(() => {
                this._validateField(json.id, instance)
            })
        }

    }

    // Submit handler
    _submitForm(instance="default") {
        var formValid = true
        var values = {}

        console.log(instance)
        if (!(instance in this.formInstances)) {
            console.error("Instance ("+instance+") not found.")
            return
        }

        var formInstance = this.formInstances[instance]

        // Validate all fields
        Object.keys(formInstance.Fields).forEach((item) => {
            var field = formInstance.Fields[item]
            console.log(item, field)

            if (field.field.readonly){
                values[item] = field.field.default_value
                return
            }

            var validation = this._validateField(field.id, instance)
            if (!(validation.Valid)) {
                formValid = false
            } 

            values[item] = validation.Value
        })

        console.log(values)

        if(!formValid) {
            formInstance.SubmitHandler(false, null)
            return
        }

        formInstance.SubmitHandler(true, values)
    }

    // Handle validation
    _validateField(fieldId, instance="default") {
        var Valid = true
        console.log(fieldId)

        var formInstance = this.formInstances[instance]
        var fieldInstance = formInstance.Fields[fieldId]

        var id = "#JsonForm-"+instance+"-Input-"+fieldId
        var name = "JsonForm-"+instance+"-Input-"+fieldId
        var Element = $(id)
        var Value = Element.val()

        var requiredMsg = "Please fill out this field"

        // Handle radios
        if (fieldInstance.field.type == "radio") {
            Value = $('input[name="'+name+'"]:checked').val();
            requiredMsg = "Please select an option"
        }

        if (fieldInstance.field.type == "checkbox" || fieldInstance.field.type == "switch") {
            Value = $(id).is(":checked")
            requiredMsg = "Please check this box"
        }

        // handle required validator
        if (fieldInstance.field.required && !Value) {
            this._invalidateInput(id, requiredMsg)
            Valid = false
        }
        if (fieldInstance.field.required && Value && formInstance.JSON.hide_validation) {
            this._prepInput(id)
        }
        if (fieldInstance.field.required && Value && !formInstance.JSON.hide_validation) {
            this._validateInput(id)
        }

        console.log(Valid, Value)
        return {Valid, Value}
    }

    // Prepares an input's validate/invalidate text and classes
    _prepInput(InputId) {
        // Determine if various states exists
        var Input = $(InputId)
        var InputParent = $(InputId).parent()
        var InvalidText = $(InputId+"-InvalidText")[0]
        var ValidText = $(InputId+"-ValidText")[0]

        // Make sure Input and Input parent exists
        if(Input == null || InputParent == null){
            console.warn("Input invalid or is missing: "+InputId)
            return False
        }

        var InputIdAttr = $(InputId).attr("id")

        // Find (and create) valid and invalid states

        if (InvalidText == null) { // if it doesn't, create it
            $(InputParent).append(`<div class="invalid-feedback" id="`+InputIdAttr+`-InvalidText" style="display: none"></div>`)
            InvalidText = $("#"+InputIdAttr+"-InvalidText")
        }

        if (ValidText == null) { // Create valid text if it doesn't exist
            $(InputParent).append(`<div class="valid-feedback" id="`+InputIdAttr+`-ValidText" style="display: none"></div>`)
            ValidText = $("#"+InputIdAttr+"-ValidText")
        }

        // Hide all helpers and reset form
        $(InvalidText).hide().text('')
        $(ValidText).hide().text('')
        $(Input).removeClass("is-invalid").removeClass("is-valid")

        return {Input, InputParent, InvalidText, ValidText}
    }

    // Show invalid state
    _invalidateInput(InputId, Msg='') {
        var Input = this._prepInput(InputId)
        if (!Input){return}

        $(Input.Input).addClass("is-invalid")
        $(Input.InvalidText).show().text(Msg)
    }

    // Show valid state
    _validateInput(InputId, Msg='') {
        var Input = this._prepInput(InputId)
        if (!Input){return}

        $(Input.Input).addClass("is-valid")
        $(Input.ValidText).show().text(Msg)
    }

    // Disable input
    _disableInput(InputId) {
        var Input = this._prepInput(InputId)
        if (!Input){return}

        $(Input.Input).attr("readonly", "true")
        $(Input.Input).attr("disabled", "true")
    }

    // Enable input
    _enableInput(InputId) {
        var Input = this._prepInput(InputId)
        if (!Input){return}

        $(Input.Input).removeAttr("readonly")
        $(Input.Input).removeAttr("disabled")
    }

    // Set form state
    _setState(state, instance="default") {
        if(!(instance in this.formInstances)) {
            console.error("Instance "+instance+" has not been initialized")
        }

        var formInstance = this.formInstances[instance]

        $(formInstance.BodyID).hide()
        $(formInstance.LoaderID).hide()
        $(formInstance.ControlsID).hide()

        if (state === "show" || state === "ready") {
            $(formInstance.BodyID).fadeIn()
            $(formInstance.ControlsID).fadeIn()
        }

        if (state === "loading") {
            $(formInstance.LoaderID).fadeIn()
        }
    }

    // Pad field json to inject defaults and validate config
    _padFieldJson(json) {
        json.isValid = false

        // Makes sure mandatory fields are in top-level
        if (!("id" in json) || !("name" in json) || !("type" in json)) {
            console.error("Field is missing mandatory top-level fields.", json)
            return json
        }

        // Check that field prop is in json when using type=field
        if (json.type == "field" && !("field" in json)){
            console.error("Field object is mandatory when type = field.", json)
            return json
        }

        // Check that html prop is in json when using type=html
        if (json.type == "html" && !("html" in json)) {
            console.error("HTML content is mandatory when type = html.", json)
            return json
        }

        // Check that value prop is in json when using type=value
        if (json.type == "value" && !("value" in json)) {
            console.error("Value is mandatory when type = value.", json)
            return json
        }

        // Field subkey specific pads
        if("field" in json) {
            // Default "true" for required
            if(!("required" in json.field)) {
                json.field.required = true
            }

            // Default "false" for readonly
            if(!("readonly" in json.field)) {
                json.field.readonly = false
            }

            // Pad default_value            
            if(!("default_value" in json.field)) {
                json.field.default_value = ""
            }

            // Pad placeholder
            if(!("placeholder" in json.field)) {
                json.field.placeholder = ""
            }

            // use_validate_callback
            if(!("use_validate_callback" in json.field)) {
                json.field.use_validate_callback = false
            }

            // Make sure options is in json.field
            if(!("options" in json.field) && json.field.type == "select") {
                console.error("Options array is mandatory when field.type = select", json)
                return json
            }

            if(!("options" in json.field) && json.field.type == "radio") {
                console.error("Options array is mandatory when field.type = radio", json)
                return json
            }
        }

        // No errors/pad finished
        json.isValid = true
        return json
    }

}