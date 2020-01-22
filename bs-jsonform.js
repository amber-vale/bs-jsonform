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

        // Tag picker implementation
        window.addEventListener("tagPicker.complete", (e) => {
            this._tagPicker_FieldHandler(e.detail)
        })
    }

    create(parent, json, instance="default") {
        this._initializeForm(parent, instance, ("skip_dom_generation" in json))
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
    _initializeForm(parent, instance="default", skip_dom=false) {
        var Parent = $(parent)
        if(Parent == undefined) {
            console.error("Parent "+parent+" not found")
            return False
        }

        // Make sure that this instance doesn't already exist
        if ((instance in this.formInstances)) {
            console.error("Cannot initialize on already initialized instance ("+instance+"). Use JsonForm.destroy('"+instance+"') to release this instance.")
        }

        if (!skip_dom) {
            // Generate the DOM ourselves
            var template = `
                <form id="JsonForm-`+instance+`" x-instance="`+instance+`" class="`+this.formClasses.Form+`">
                    <div id="JsonForm-`+instance+`-Loader" style="display: none"></div>
                    <div class="row" id="JsonForm-`+instance+`-Body" style="display: none"></div>
                    <div id="JsonForm-`+instance+`-Controls" style="display: none"></div>
                </form>
            `

            Parent.append(template)
        } else {
            // Fix DOM
            $("#JsonForm-"+instance+"-Body").addClass("row")
        }

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

        if (!("button_orientation" in json)){
            json.button_orientation = "right"
        }

        this.formInstances[instance].JSON = json

        if(("form_controls_id" in json)) {
            this.formInstances[instance].ControlsID = json.form_controls_id
        }

        // Configure orientation and options
        var controls = `
        <div class="float-right mt-3">
            <button type="submit" class="btn btn-primary">`+json.submit_button_text+`</button>
        </div>`

        if (json.button_orientation == "left") {
            controls = `
            <div class="mt-3">
                <button type="submit" class="btn btn-primary">`+json.submit_button_text+`</button>
            </div>`
        }

        if (json.button_orientation == "center") {
            controls = `
            <div class="d-flex mt-3">
                <div class="justify-content-center">
                    <button type="submit" class="btn btn-primary">`+json.submit_button_text+`</button>
                </div>
            </div>`
        }

        // Build form controls
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
        
        // Process options into KV store
        if (("options" in json.field)) {
            // if array, dupe
            if (Array.isArray(json.field.options)) {
                json.field.optionskeys = json.field.options
                json.field.optionsvalues = json.field.options
            } else if (typeof json.field.options == "object") {
                // Convert into kv
                json.field.optionskeys = Object.keys(json.field.options)
                json.field.optionsvalues = Object.values(json.field.options)
            }
        }

        // Build DOM
        switch (json.field.type) {
            // Generate switch
            case "switch":
                var isChecked = ""
                if (json.field.default_value == "checked" || json.field.default_value 
                == "true" || json.field.default_value == "selected") {
                    isChecked = "checked"
                }
                template = `<div class="col-`+json.field.width+`">
                <div class="custom-control custom-switch mt-3">
                    <input type="checkbox" class="custom-control-input" id="`+id+`" `+isChecked+`>
                    <label class="custom-control-label" for="`+id+`">`+json.name+`</label>
                </div></div>
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
                <div class="col-`+json.field.width+`">
                    <div class="custom-control custom-checkbox mt-3">
                        <input type="checkbox" class="custom-control-input" id="`+id+`" `+isChecked+`>
                        <label class="custom-control-label" for="`+id+`">`+json.name+`</label>
                    </div>
                </div>
                `
                break
            // Generate radios
            case "radio":
                template = `<div class="col-`+json.field.width+`"><div class="mt-3"><p class="mb-2 mt-0" id="`+id+`">`+json.name+`</p>`

                json.field.optionskeys.forEach((item, index) => {
                    var isSelected = ""
                    if (json.field.default_value == item) {
                        isSelected = "checked"
                    }
                    template += `
                    <div class="custom-control custom-radio">
                        <input type="radio" id="`+id+index+`" name="`+id+`" value="`+item+`" class="custom-control-input" `+isSelected+`>
                        <label class="custom-control-label" for="`+id+index+`">`+json.field.optionsvalues[index]+`</label>
                    </div>`
                })

                template += "</div></div>"

                break
            // Generate select
            case "select":
                template = `<div class="col-`+json.field.width+`">
                <div class="mt-3">
                    <p class="mb-2 mt-0">`+json.name+`</p>
                    <select class="custom-select" id="`+id+`">    
                `

                json.field.optionskeys.forEach((item, index) => {
                    var isSelected = ""
                    if (json.field.default_value == item) {
                        isSelected = "selected"
                    }
                    template += `
                    <option `+isSelected+` value="`+item+`">`+json.field.optionsvalues[index]+`</option>`
                })

                template += "</select></div></div>"

                break
            case "file":
                template = `
                <div class="col-`+json.field.width+`">
                <div class="custom-file mt-3">
                    <input type="file" class="custom-file-input" id="`+id+`">
                    <label class="custom-file-label" for="`+id+`" id="`+id+`-Label">Choose file</label>
                </div>
                </div>
                `
                break
            // Textarea element
            case "textarea":
                template = `
                <div class="col-`+json.field.width+`">
                <div class="form-group">
                    <label for="`+id+`">Example textarea</label>
                    <textarea class="form-control" id="`+id+`" rows="`+json.field.rows+`"></textarea>
                </div>
                </div>
                `
                break
            case "hidden":
                template = `<div class="col-`+json.field.width+`">
                <input type="hidden" id="`+id+`" value="`+json.field.default_value+`"></input>
                </div>           
                `
                break
            // Otherwise do a normal input
            default:
                template = `
                <div class="col-`+json.field.width+`">
                <div class="form-group">
                    <label for="`+id+`">`+json.name+`</label>
                    <input type="`+json.field.type+`" class="form-control" id="`+id+`" placeholder="`+json.field.placeholder+`" value="`+json.field.default_value+`">
                </div>
                </div>
                `
        }
        
        $(formInstance.BodyID).append(template)
        this._prepInput("#"+id)

        // If it is marked as readonly, disable input
        if(json.field.readonly){
            this._disableInput("#"+id)
        }

        // If it has a helper text, show
        if (json.field.helptext != "") {
            this._setHelpText("#"+id, json.field.helptext)
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

        if (!(instance in this.formInstances)) {
            console.error("Instance ("+instance+") not found.")
            return
        }

        var formInstance = this.formInstances[instance]

        // Validate all fields
        Object.keys(formInstance.Fields).forEach((item) => {
            var field = formInstance.Fields[item]

            if (field.field.readonly){
                values[item] = field.field.default_value
                return
            }

            var validation = this._validateField(field.id, instance)
            if (!(validation.Valid)) {
                formValid = false
            } 

            // Handle file input
            if(field.field.type == "file") {
                values[item] = {
                    Name: validation.Value,
                    Files: $("#JsonForm-"+instance+"-Input-"+field.id)[0].files
                }
                return 
            }
            values[item] = validation.Value
        })

        if(!formValid) {
            formInstance.SubmitHandler(false, null)
            return
        }

        formInstance.SubmitHandler(true, values)
    }

    // Handle validation
    _validateField(fieldId, instance="default") {
        var Valid = true

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

        // Handle checks/switches
        if (fieldInstance.field.type == "checkbox" || fieldInstance.field.type == "switch") {
            Value = $(id).is(":checked")
            requiredMsg = "Please check this box"
        }

        // Handle file inputs
        if (fieldInstance.field.type == "file") {
            requiredMsg = "Please upload a file"
        }

        // handle required validator
        if (fieldInstance.field.required && !Value) {
            // Handle file input
            if (fieldInstance.field.type == "file") {
                $(id+"-Label").text("Choose file")
            }
            this._invalidateInput(id, requiredMsg)
            Valid = false
        }
        if (fieldInstance.field.required && Value && formInstance.JSON.hide_validation) {
            this._prepInput(id)
        }
        if (fieldInstance.field.required && Value && !formInstance.JSON.hide_validation) {
            this._validateInput(id)
        }

        // Update label on file
        if (fieldInstance.field.type == "file" && Value) {
            var filename = this._fileInputStrip(Value)
            $(id+"-Label").text(filename)
        }

        return {Valid, Value}
    }

    // Prepares an input's validate/invalidate text and classes
    _prepInput(InputId, reset=true) {
        // Determine if various states exists
        var Input = $(InputId)
        var InputParent = $(InputId).parent()
        var InvalidText = $(InputId+"-InvalidText")[0]
        var ValidText = $(InputId+"-ValidText")[0]
        var HelpText = $(InputId+"-HelpText")[0]

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

        if (HelpText == null) { // Create help text
            $(InputParent).append(`<div class="help-feedback text-muted form-text" id="`+InputIdAttr+`-HelpText" style="display: none"></div>`)
            HelpText = $("#"+InputIdAttr+"-HelpText")
        }

        // Hide all helpers and reset form
        if(reset) {
            $(InvalidText).hide().text('')
            $(ValidText).hide().text('')
            $(Input).removeClass("is-invalid").removeClass("is-valid")
        }

        return {Input, InputParent, InvalidText, ValidText, HelpText}
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

    // Sets helper text
    _setHelpText(InputId, Msg='') {
        var Input = this._prepInput(InputId)
        if (!Input){return}
        $(Input.HelpText).show().text(Msg)
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

            // Pad width
            if(!("width" in json.field)) {
                json.field.width = "12"
            }
            
            // Pad rows for textarea
            if(!("rows" in json.field)) {
                json.field.rows = "3"
            }

            // Pad help text
            if(!("helptext" in json.field)) {
                json.field.helptext = ""
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

    _fileInputStrip(fullPath) {
        var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
        var filename = fullPath.substring(startIndex);
        if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
            filename = filename.substring(1);
        }
        return filename
    }

}