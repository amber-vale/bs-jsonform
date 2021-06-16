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

    destroy(instance="default") {
        if(!(instance in this.formInstances)) {
            console.error("Instance "+instance+" has not been initialized")
            return false
        }

        var formInstance = this.formInstances[instance]
        $(formInstance.FormID).remove()

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

                $(formInstance.BodyID).append(`<div class="col-12">`+field.html+`</div>`)
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

        // Build DOM
        switch (json.field.type) {
            case "list": 
                template = `<div class="col-12"><div id="`+id+`"></div></div>`
                $(formInstance.BodyID).append(template)

                this._listInputHandler(id, "initialize", instance)

                // Build list if we have default values
                if (("default_value" in json.field) && Array.isArray(json.field.default_value)){
                    this._listInputHandler(id, "setValues", instance)
                }

                break
            default:
                template = this._getFieldTemplate(id, json)
                $(formInstance.BodyID).append(template)
                this._prepInput("#"+id)
        }
        

        // If it is marked as readonly, disable input
        if(json.field.readonly){
            this._disableInput("#"+id)
        }

        // If it has a helper text, show
        if (json.field.helptext != "") {
            this._setHelpText("#"+id, json.field.helptext)
        }

        // Handle field update handlers
        if(json.field.type !== "radio" && json.field.type !== "list") {
            // Register event handlers
            $("#"+id).change(() => {
                this._validateField(json.id, instance)
            })
        } else if (json.field.type === "list") {
            // Do nothing for lists as it has its own handlers
            return
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

            if (field.field.readonly && field.field.type != "list"){
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
        var Value = this._inputValue(id).Value

        var requiredMsg = "Please fill out this field"

        // Handle radios
        if (fieldInstance.field.type == "radio") {
            requiredMsg = "Please select an option"
        }

        // Handle checks/switches
        if (fieldInstance.field.type == "checkbox" || fieldInstance.field.type == "switch") {
            requiredMsg = "Please check this box"
        }

        // Handle file inputs
        if (fieldInstance.field.type == "file") {
            requiredMsg = "Please upload a file"
        }

        // Handle list inputs
        if (fieldInstance.field.type == "list") {
            Value = this._listInputHandler(name, "getValues", instance)
            requiredMsg = "Please add at least one entry"
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
        
        if (fieldInstance.field.required && fieldInstance.field.type == "list") {
            if (Object.keys(Value).length == 0 || Object.keys(Value[1]).length == 0) {
                this._invalidateInput(id, requiredMsg)
                Valid = false
            } 
        }

        if (fieldInstance.field.required && Valid && formInstance.JSON.hide_validation) {
            this._prepInput(id)
        }
        if (fieldInstance.field.required && Valid && !formInstance.JSON.hide_validation) {
            this._validateInput(id)
        }

        // Update label on file
        if (fieldInstance.field.type == "file" && Value) {
            var filename = this._fileInputStrip(Value)
            $(id+"-Label").text(filename)
        }

        return {Valid, Value}
    }

    // Helper for getting the value of an input
    _inputValue(id) {
        var Element = $(id)
        if (!Element) {return}

        if (Element.prop("nodeName") == "P") {
            Value = $('input[name="'+id.replace("#", "")+'"]:checked').val()
            return {Value, Type: "radio"}
        }

        var Value = ""

        switch (Element.attr("type")) {
            case "checkbox" || "radio":
                Value = Element.is(":checked")
                break
            default:
                Value = Element.val()
        }

        return {Value, Type: Element.attr("type")}
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

    // Create template
    _getFieldTemplate(id, json, enable_label=true, spacer_class="mt-3") {
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

        // Sizing class
        var sizeClass = ""
        if (json.field.size == "large"){sizeClass = "form-control-lg"}
        if (json.field.size == "small"){sizeClass = "form-control-sm"}

        var template = ''
        switch (json.field.type) {
            // Generate switch
            case "switch":
                var isChecked = ""
                if (json.field.default_value == "checked" || json.field.default_value 
                == "true" || json.field.default_value == "selected") {
                    isChecked = "checked"
                }
                
                template = `<div class="col-`+json.field.width+`">
                <div class="custom-control custom-switch `+spacer_class+`">
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
                    <div class="custom-control custom-checkbox `+spacer_class+`">
                        <input type="checkbox" class="custom-control-input" id="`+id+`" `+isChecked+`>
                        <label class="custom-control-label" for="`+id+`">`+json.name+`</label>
                    </div>
                </div>
                `
                break
            // Generate radios
            case "radio":
                template = `<div class="col-`+json.field.width+`"><div class="`+spacer_class+`"><p class="mb-2 mt-0" id="`+id+`">`+json.name+`</p>`

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
                var label = ''
                if (enable_label) {label = `<p class="mb-2 mt-0">`+json.name+`</p>`}

                template = `<div class="col-`+json.field.width+`">
                <div class="`+spacer_class+`">
                    `+label+`   
                    <select class="custom-select `+sizeClass+`" id="`+id+`">    
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
                var label = ''
                if (enable_label) {label = `<p class="mb-2 mt-0">`+json.name+`</p>`}

                template = `
                <div class="col-`+json.field.width+` `+spacer_class+`">
                `+label+`
                <div class="custom-file">
                    <input type="file" class="custom-file-input `+sizeClass+`" id="`+id+`">
                    <label class="custom-file-label" for="`+id+`" id="`+id+`-Label">Choose file</label>
                </div>
                </div>
                `
                break
            // Textarea element
            case "textarea":
                var label = ''
                if (enable_label) {label = `<label for="`+id+`">`+json.name+`</label>`}

                template = `
                <div class="col-`+json.field.width+`">
                <div class="form-group `+spacer_class+`">
                    `+label+`
                    <textarea class="form-control `+sizeClass+`" id="`+id+`" rows="`+json.field.rows+`" placeholder="`+json.field.placeholder+`"></textarea>
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
                var label = ''
                if (enable_label) {label = `<label for="`+id+`">`+json.name+`</label>`}

                template = `
                <div class="col-`+json.field.width+`">
                <div class="form-group `+spacer_class+`">
                    `+label+`
                    <input type="`+json.field.type+`" class="form-control `+sizeClass+`" id="`+id+`" placeholder="`+json.field.placeholder+`" value="`+json.field.default_value+`">
                </div>
                </div>
                `
        }
        return template
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
    _padFieldJson(json, is_list=false) {
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

            // Pad maximum entries in list
            if(!("maximum_entries" in json.field)) {
                json.field.maximum_entries = 100
            }

            // Pad help text
            if(!("helptext" in json.field)) {
                json.field.helptext = ""
            }
            
            // Pad sizing
            if(!("size" in json.field)) {
                json.field.size = "normal"
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

    // file input handler
    _fileInputStrip(fullPath) {
        var startIndex = (fullPath.indexOf('\\') >= 0 ? fullPath.lastIndexOf('\\') : fullPath.lastIndexOf('/'));
        var filename = fullPath.substring(startIndex);
        if (filename.indexOf('\\') === 0 || filename.indexOf('/') === 0) {
            filename = filename.substring(1);
        }
        return filename
    }

    // list input handler 
    _listInputHandler(id, event, instance="default", offset=0, domEvent=null) {

        var fieldId = id.replace("JsonForm-"+instance+"-Input-", "")
        fieldId = fieldId.replace("#", "")

        if(!(instance in this.formInstances)) {
            console.error("Instance "+instance+" has not been initialized")
        }

        var formInstance = this.formInstances[instance]
        var fieldInstance = formInstance.Fields[fieldId]

        switch (event) {
            // Handle initializing a list
            case "initialize":
                var width = 10
                // Create DOM
                var template = `
                    <p class="mt-3 mb-2">`+fieldInstance.name+`</p>
                    <div class="row" id="`+id+`-Row"></div>
                ` 
                $("#"+id).html(template)

                // Determine if we need to gen DOM
                if (!("fields" in fieldInstance.field)) {
                    template = `
                    <div class="col-10">
                        <input id="`+id+`-AddInput-0" type="`+fieldInstance.field.type+`" placeholder="`+fieldInstance.field.placeholder+`" class="form-control"></input> 
                    </div>`
                } else {
                    // Create the DOM
                    template = ``
                    width = Math.floor(10 / (fieldInstance.field.fields.length - offset))
                    fieldInstance.field.fields.forEach((item, index) => {
                        item.field.width = width
                        var domId = id+"-AddInput-"+index
                        item = this._padFieldJson(item)
                        template += this._getFieldTemplate(domId, item, false, "mb-0")
                    })
                }

                var addBtnClass = "col-2"
                if (width == 3) {
                    addBtnClass = "col-3"
                }

                template += `
                <div class="`+addBtnClass+`">
                    <button id="`+id+`-AddBtn" type="button" class="w-100 btn btn-primary">Add</button>
                </div>
                `

                if(!fieldInstance.field.readonly) {
                    $("#"+id+"-Row").html(template)
                }

                // Register events
                $(document).on("click", "#"+id+"-AddBtn", () => {
                    this._listInputHandler(id, "addItem", instance)
                })
                break
            // Handle addItem event
            case "addItem":
                if (fieldInstance.field.readonly){return}

                var width = 10
                // Create DOM
                var template = ``

                // Get values
                var values = []
                if (!("fields" in fieldInstance.field)) {
                    values[0] = $("#"+id+"-AddInput-0").val()
                } else {
                    fieldInstance.field.fields.forEach((item, index) => {
                        var domId = "#"+id+"-AddInput-"+index
                        values[index] = this._inputValue(domId).Value
                    })
                }

                // CHeck validation
                var valid = true
                values.forEach((item, index) => {
                    var domId = "#"+id+"-AddInput-"+index
                    if (!item){
                        valid = false
                        this._invalidateInput(domId)
                        return
                    } else {
                        this._prepInput(domId)
                    }
                })
                if (!valid){return}
                
                // Add item to ct
                if (!("ct" in fieldInstance.field)){
                    fieldInstance.field.ct = 1
                } else {
                    fieldInstance.field.ct += 1
                }
                
                var template = ''
                // Determine if we need to gen DOM
                if (!("fields" in fieldInstance.field)) {
                    template = `
                    <div class="col-10 mb-3">
                        <input id="`+id+`-ItemInput-0-`+fieldInstance.field.ct+`" type="`+fieldInstance.field.type+`" placeholder="`+fieldInstance.field.placeholder+`" class="form-control" value="`+values[0]+`"></input> 
                    </div>`
                    $(document).on("change", "#"+id+"-ItemInput-0-"+fieldInstance.field.ct, () => {
                        this._listInputHandler(id, "updateValue", instance)
                    })
                } else {
                    // Create the DOM
                    template = ``
                    width = Math.floor(10 / fieldInstance.field.fields.length)
                    fieldInstance.field.fields.forEach((item, index) => {
                        item.field.width = width
                        item.field.default_value = values[index]
                        var domId = id+"-ItemInput-"+index+"-"+fieldInstance.field.ct
                        item = this._padFieldJson(item)
                        template += this._getFieldTemplate(domId, item, false, "mb-3")
                        // Register events
                        $(document).on("change", "#"+domId, (e) => {
                            this._listInputHandler(id, "updateValue", instance, offset, e)
                        })
                    })
                }

                var btnClass = "col-2"
                if (width == 3) {
                    btnClass = "col-3"
                }

                template += `
                    <div class="`+btnClass+`" id="`+id+`-`+fieldInstance.field.ct+`-RmWrapper">
                        <button id="`+id+`-`+fieldInstance.field.ct+`-RmBtn" type="button" class="w-100 btn btn-danger" x-ct="`+fieldInstance.field.ct+`">&times;</button>
                    </div>
                `
                var previous = $("#"+id+"-Row").html()
                $("#"+id+"-Row").html(template + previous)

                // Register events
                $(document).on("click", "#"+id+"-"+fieldInstance.field.ct+"-RmBtn", (e) => {
                    this._listInputHandler(id, "rmItem", instance, offset, e)
                })
                break
            // Remove item
            case "rmItem":
                if (!domEvent){return}
                if (fieldInstance.field.readonly){return}
                var ct = $(domEvent.target).attr("x-ct")
                
                // Remove DOM
                if (!("fields" in fieldInstance.field)) {
                    $("#"+id+"-ItemInput-0-"+ct).parent().remove()
                    $("#"+id+"-ItemInput-0-"+ct).remove()
                } else {
                    fieldInstance.field.fields.forEach((item, index) => {
                        var domId = id+"-ItemInput-"+index+"-"+ct
                        $("#"+domId).parent().remove()
                        $("#"+domId).remove()
                    })
                }

                $("#"+id+"-"+ct+"-RmWrapper").remove()

                break
            // Get values
            case "getValues":
                // Build an array of the results
                var ct = 1
                var values = {}
                for (ct = 1; ct <= fieldInstance.field.ct; ct++) {
                    if (!("fields" in fieldInstance.field)) {
                        if(!(1 in values)){values[1] = {}}
                        var domId = "#"+id+"-ItemInput-0-"+ct
                        values[1][ct] = this._inputValue(domId).Value
                    } else {
                        fieldInstance.field.fields.forEach((item, index) => {
                            if(!(ct in values)){values[ct] = {}}
                            var domId = "#"+id+"-ItemInput-"+index+"-"+ct
                            values[ct][item.id] = this._inputValue(domId).Value
                        })
                    }
                }
                return values
            case "setValues":
                // Build the list based on the results
                fieldInstance.default_value.forEach((item, index) => {
                    var values = item
                    // Add item to ct
                    if (!("ct" in fieldInstance.field)){
                        fieldInstance.field.ct = 1
                    } else {
                        fieldInstance.field.ct += 1
                    }
                    
                    var template = ''
                    // Determine if we need to gen DOM
                    if (!("fields" in fieldInstance.field)) {
                        template = `
                        <div class="col-10 mb-3">
                            <input id="`+id+`-ItemInput-0-`+fieldInstance.field.ct+`" type="`+fieldInstance.field.type+`" placeholder="`+fieldInstance.field.placeholder+`" class="form-control" value="`+values[0]+`"></input> 
                        </div>`
                        $(document).on("change", "#"+id+"-ItemInput-0-"+fieldInstance.field.ct, () => {
                            this._listInputHandler(id, "updateValue", instance)
                        })
                    } else {
                        // Create the DOM
                        template = ``
                        width = Math.floor(10 / fieldInstance.field.fields.length)
                        fieldInstance.field.fields.forEach((item, index) => {
                            item.field.width = width
                            item.field.default_value = values[index]
                            var domId = id+"-ItemInput-"+index+"-"+fieldInstance.field.ct
                            item = this._padFieldJson(item)
                            template += this._getFieldTemplate(domId, item, false, "mb-3")
                            // Register events
                            $(document).on("change", "#"+domId, (e) => {
                                this._listInputHandler(id, "updateValue", instance, offset, e)
                            })
                        })
                    }

                    var btnClass = "col-2"
                    if (width == 3) {
                        btnClass = "col-3"
                    }

                    var btnDisabled = ""
                    if (fieldInstance.field.readonly){btnDisabled = "disabled"}

                    template += `
                        <div class="`+btnClass+`" id="`+id+`-`+fieldInstance.field.ct+`-RmWrapper">
                            <button id="`+id+`-`+fieldInstance.field.ct+`-RmBtn" type="button" class="w-100 btn btn-danger" x-ct="`+fieldInstance.field.ct+`" `+btnDisabled+`>&times;</button>
                        </div>
                    `
                    var previous = $("#"+id+"-Row").html()
                    $("#"+id+"-Row").html(template + previous)
                    // Register events
                    $(document).on("click", "#"+id+"-"+fieldInstance.field.ct+"-RmBtn", (e) => {
                        this._listInputHandler(id, "rmItem", instance, offset, e)
                    })
                })
                break
        }
    }

}