var miruken  = require('../../lib/miruken.js'),
    mvc      = require('../../lib/mvc'),
    chai     = require("chai"),
    expect   = chai.expect;
              
eval(base2.namespace);
eval(miruken.namespace);
eval(miruken.context.namespace);
eval(miruken.validate.namespace);
eval(miruken.mvc.namespace);

new function () { // closure

    var mvc_test = new base2.Package(this, {
        name:    "mvc_test",
        exports: "Person,Doctor,PersonController"
    });

    eval(this.imports);

    var Person = Model.extend({
        $properties: {
            firstName: { 
                validate: $required 
            },
            lastName:  {
                validate: $required
            },
            age: {
                value: 0,
                validate: {
                    numericality: {
                        onlyInteger: true,
                        greaterThan: 11
                    }
                }
            }
        },
        getHobbies: function () { return this._hobbies; },
        setHobbies: function (value) { this._hobbies = value; }
    });
   
    var Doctor = Person.extend({
        $properties: {
            patient: { map: Person }
        }
    });

    var PersonController = Controller.extend({
        $properties: {
            person: {
                map: Person,
                validate: {
                    presence: true,
                    nested:   true
                }
            }
        }
    });

    eval(this.exports);

}

eval(base2.mvc_test.namespace);

describe("Model", function () {
    describe("#constructor", function () {
        it("should infer properties", function () {
            var person = new Person;
            person.setHobbies(['Soccer', 'Tennis']);
            expect(person.hobbies).to.eql(['Soccer', 'Tennis']);
        });

        it("should construct model from data", function () {
            var person = new Person({
                firstName: 'Carl',
                lastName:  'Lewis'
            });
            expect(person.firstName).to.equal('Carl');
            expect(person.lastName).to.equal('Lewis');
        });
    });

    describe("#fromData", function () {
        it("should import from data", function () {
            var person = new Person;
            person.fromData({
                firstName: 'David',
                lastName:  'Beckham'
            });
            expect(person.firstName).to.equal('David');
            expect(person.lastName).to.equal('Beckham');
        });
    });

    describe("#toData", function () {
        it("should export all data", function () {
            var person = new Person({
                   firstName: 'Christiano',
                   lastName:  'Ronaldo',
                   age:       23
                }),
                data = person.toData();
            expect(data).to.eql({
                firstName: 'Christiano',
                lastName:  'Ronaldo',
                hobbies:   undefined,
                age:       23
            });
        });

        it("should export partial data", function () {
            var person = new Person({
                    firstName: 'Christiano',
                    lastName:  'Ronaldo',
                    age:       23
                }),
                data = person.toData({lastName: true});
            expect(data).to.eql({
                lastName: 'Ronaldo'
            });
        });
        
        it("should export nested data", function () {
            var person = new Person({
                    firstName: 'Lionel',
                    lastName:  'Messi',
                    age:       24
                }),
                doctor = new Doctor({
                    firstName: 'Mitchell',
                    lastName:  'Moskowitz',
                });
            doctor.patient = person;
            expect(doctor.toData()).to.eql({
                firstName: 'Mitchell',
                lastName:  'Moskowitz',
                hobbies:   undefined,
                age:       0,
                patient: {
                    firstName: 'Lionel',
                    lastName:  'Messi',
                    hobbies:   undefined,
                    age:       24
                }
            });
        });

        it("should export partial nested data", function () {
            var person = new Person({
                    firstName: 'Lionel',
                    lastName:  'Messi',
                    age:       24
                }),
                doctor = new Doctor({
                    firstName: 'Mitchell',
                    lastName:  'Moskowitz',
                });
            doctor.patient = person;
            var data = doctor.toData({
                patient: {
                    lastName: true,
                    age: true
                }
            });
            expect(data).to.eql({
                patient: {
                    lastName:  'Messi',
                    age:       24
                }
            });
        });

        it("should export rooted data", function () {
            var PersonWrapper = Model.extend({
                    $properties: {
                        person: { map: Person, root: true }
                    }
                }),
                wrapper = new PersonWrapper({
                    firstName: 'Franck',
                    lastName:  'Ribery',
                    age:       32
                });
            expect(wrapper.person.firstName).to.equal('Franck');
            expect(wrapper.person.lastName).to.equal('Ribery');
            expect(wrapper.toData()).to.eql({
                firstName: 'Franck',
                lastName:  'Ribery',
                hobbies:   undefined,
                age:       32
            });
        });

        it("should export partial rooted data", function () {
            var PersonWrapper = Model.extend({
                    $properties: {
                        person: { map: Person, root: true }
                    }
                }),
                wrapper = new PersonWrapper({
                    firstName: 'Franck',
                    lastName:  'Ribery',
                    age:       32
                });
            expect(wrapper.toData({person: { age: true }})).to.eql({
                age: 32
            });
        });
    });

    describe("#map", function () {
        it("should map one-to-one", function () {
            var data = {
                firstName: 'Daniel',
                lastName:  'Worrel',
                patient:   {
                    firstName: 'Emitt',
                    lastName:  'Smith'
                }
            }
            var doctor  = new Doctor(data),
                patient = doctor.patient; 
            expect(doctor.firstName).to.equal('Daniel');
            expect(doctor.lastName).to.equal('Worrel');
            expect(patient).to.be.instanceOf(Person);
            expect(patient.firstName).to.equal('Emitt');
            expect(patient.lastName).to.equal('Smith');
        });

        it("should map one-to-many", function () {
            var data = {
                firstName: 'Daniel',
                lastName:  'Worrel',
                patient:   [{
                    firstName: 'Emitt',
                    lastName:  'Smith'
                }, {
                    firstName: 'Tony',
                    lastName:  'Romo'
                }]  
            }
            var doctor   = new Doctor(data),
                patients = doctor.patient; 
            expect(doctor.firstName).to.equal('Daniel');
            expect(doctor.lastName).to.equal('Worrel');
            expect(patients).to.be.instanceOf(Array);
            expect(patients).to.have.length(2);
            expect(patients[0].firstName).to.equal('Emitt');
            expect(patients[0].lastName).to.equal('Smith');
            expect(patients[1].firstName).to.equal('Tony');
            expect(patients[1].lastName).to.equal('Romo');
        });

        it("should ignore case", function () {
            var data = {
                fiRstNamE: 'Bruce',
                LaStNaMe:  'Lee'
            }
            var person = new Person(data);
            expect(person.firstName).to.equal('Bruce');
            expect(person.lastName).to.equal('Lee');
        });

        it("should preserve grouping", function () {
            var data = {
                patient:   [[{
                    firstName: 'Abbot',
                    }, {
                    firstName: 'Costello',
                    }],
                    [{
                    firstName: 'Bill'
                    }]
                ]  
            }
            var doctor = new Doctor(data),
                group1 = doctor.patient[0],
                group2 = doctor.patient[1];
            expect(group1[0].firstName).to.equal('Abbot');
            expect(group1[1].firstName).to.equal('Costello');
            expect(group2[0].firstName).to.equal('Bill');
        });

        it("should use root mapping", function () {
            var PersonModel = Model.extend({
                $properties: {
                    person: { map: Person, root: true }
                }
            }),
                data = {
                    firstName: 'Henry',
                    lastName:  'Ford'
            }
            var model = new PersonModel(data);
            expect(model.person.firstName).to.equal('Henry');
            expect(model.person.lastName).to.equal('Ford');
        });
    });
});

describe("Controller", function () {
    var context;
    beforeEach(function() {
        context   = new Context;
        context.addHandlers(new ValidationCallbackHandler, new ValidateJsCallbackHandler);
    });

    describe("#validate", function () {
        it("should require a context", function () {
            var controller = new PersonController;
            expect(function () {
                controller.validate();
            }).to.throw(Error, "Validation requires a context to be available.");
        });

        it("should validate the controller", function () {
            var controller = new PersonController;
            controller.context = context;
            var results = controller.validate();
            expect(results.valid).to.be.false;
            expect(results.person.errors.presence).to.eql([{
                message: "Person can't be blank",
                value:   undefined
            }]);
        });

        it("should validate object", function () {
            var controller     = new PersonController;
            controller.context = context;
            var results = controller.validate(new Person);
            expect(results.valid).to.be.false;
            expect(results.firstName.errors.presence).to.eql([{
                message: "First name can't be blank",
                value:   undefined
            }]);
            expect(results.lastName.errors.presence).to.eql([{
                message: "Last name can't be blank",
                value:   undefined
            }]);
            expect(results.age.errors.numericality).to.deep.include.members([{
                  message: "Age must be greater than 11",
                  value:   0
            }]);
        });

        it("should access validation errors from controller", function () {
            var controller     = new PersonController;
            controller.person  = new Person;
            controller.context = context;
            controller.validate();
            var results = controller.$validation;
            expect(results.valid).to.be.false;
            expect(results.errors.presence).to.deep.have.members([{
                key: "person.firstName",
                message: "First name can't be blank",
                value:   undefined
            }, {
                key: "person.lastName",
                message: "Last name can't be blank",
                value:   undefined
            }]);
            expect(results.errors.numericality).to.deep.include.members([{
                  key:     "person.age",
                  message: "Age must be greater than 11",
                  value:   0
            }]);
        });
    });

    describe("#validateAsync", function () {
        it("should require a context", function () {
            var controller = new PersonController;
            expect(function () {
                controller.validateAsync();
            }).to.throw(Error, "Validation requires a context to be available.");
        });

        it("should validate the controller", function () {
            var controller = new PersonController;
            controller.context = context;
            controller.validateAsync().then(function (results) {
                expect(results.valid).to.be.false;
                expect(results.person.errors.presence).to.eql([{
                    message: "Person can't be blank",
                    value:   undefined
                }]);
            });
        });

        it("should validate object", function () {
            var controller     = new PersonController;
            controller.context = context;
            controller.validateAsync(new Person).then(function (results) {
                expect(results.valid).to.be.false;
                expect(results.firstName.errors.presence).to.eql([{
                    message: "First name can't be blank",
                    value:   undefined
                }]);
                expect(results.lastName.errors.presence).to.eql([{
                    message: "Last name can't be blank",
                    value:   undefined
                }]);
                expect(results.age.errors.numericality).to.deep.include.members([{
                    message: "Age must be greater than 11",
                    value:   0
                }]);
            });
        });

        it("should access validation errors from controller", function () {
            var controller     = new PersonController;
            controller.person  = new Person;
            controller.context = context;
            controller.validateAsync().then(function () {
                var results = controller.$validation;
                expect(results.valid).to.be.false;
                expect(results.errors.presence).to.eql([{
                    key: "person.firstName",
                    message: "First name can't be blank",
                    value:   undefined
                }, {
                    key: "person.lastName",
                    message: "Last name can't be blank",
                    value:   undefined
                }]);
                expect(results.errors.numericality).to.deep.include.members([{
                    key:     "person.age",
                    message: "Age must be greater than 11",
                    value:   0
                }]);
            });
        });
    });
});
