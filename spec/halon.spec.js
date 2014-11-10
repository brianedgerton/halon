var halon = require( "../src/halon.js" );
var adapterFactory = require( "./adapterStub.js" );
require( "mocha" );
var should = require( "should" ); //jshint ignore:line
var expectedOptionsResponse = require( "./mockResponses/options.json" );
var expectedBoardResponse = require( "./mockResponses/board101.json" );
var expectedCardTypeResponse = require( "./mockResponses/board101cardtypes.json" );
var expectedUserResponse = require( "./mockResponses/user1.json" );
var _ = require( "lodash" );

describe( "halon", function() {
	describe( "when initializing a halon client", function() {
		describe( "with no start delay", function() {
			var hc;
			var results = [];
			before( function( done ) {
				hc = halon( {
					root: "http://localhost:8088/analytics/api",
					knownOptions: {
						board: [ "self", "users", "cardTypes" ]
					},
					adapter: adapterFactory( results ),
					version: 2
				} );
				hc.onReady( function( hc ) {
					done();
				} );
			} );
			it( "should make an OPTIONS request", function() {
				results.length.should.equal( 2 );
				results[ 1 ].should.eql( expectedOptionsResponse );
			} );
			it( "should contain the proper headers", function() {
				results[ 0 ][ 1 ].headers.Accept.should.equal( "application/hal.v2+json" );
			} );
			it( "should create expected options structure on halon client instance", function() {
				hc.should.have.property( "_actions" );
				hc._links.should.eql( expectedOptionsResponse._links );
			} );
		} );
		describe( "with a startup delay", function() {
			var hc;
			var results = [];
			var events = [];
			before( function( done ) {
				hc = halon( {
					root: "http://localhost:8088/analytics/api",
					knownOptions: {
						board: [ "self", "users", "cardTypes" ],
						user: [ "self" ]
					},
					adapter: adapterFactory( results ),
					version: 1,
					doNotStart: true
				} );
				hc.fsm.on( "deferred", function( data ) {
					events.push( data );
				} );
				hc._actions.board.self( { id: 101 } );
				hc._actions.user.self( { id: 1 } );
				hc.start();
				hc.onReady( function( hc ) {
					done();
				} );
			} );
			it( "should allow pre-defined resource methods to fire before options response returns", function() {
				events[ 0 ].queuedArgs.args[ 0 ].should.equal( "invoke.resource" );
				events[ 0 ].queuedArgs.args[ 2 ].should.equal( "board:self" );
				events[ 0 ].queuedArgs.args[ 3 ].should.eql( { id: 101 } );
				events[ 1 ].queuedArgs.args[ 0 ].should.equal( "invoke.resource" );
				events[ 1 ].queuedArgs.args[ 2 ].should.equal( "user:self" );
				events[ 1 ].queuedArgs.args[ 3 ].should.eql( { id: 1 } );
			} );
			it( "should replay queued requests once in ready state", function() {
				results[ 2 ][ 0 ].should.eql( {
					href: "/analytics/api/board/101",
					method: "GET",
					templated: true
				} );
				results[ 2 ][ 1 ].should.eql( {
					data: { id: 101 },
					headers: { Accept: "application/hal.v1+json" }
				} );
				results[ 3 ][ 0 ].should.eql( {
					href: "/analytics/api/user/1",
					method: "GET",
					templated: true
				} );
				results[ 3 ][ 1 ].should.eql( {
					data: { id: 1 },
					headers: { Accept: "application/hal.v1+json" }
				} );
			} );
			it( "should create expected options structure on halon client instance", function() {
				hc.should.have.property( "_actions" );
				hc._links.should.eql( expectedOptionsResponse._links );
			} );
			it( "should make an OPTIONS request", function() {
				results[ 0 ][ 0 ].should.eql( { href: "http://localhost:8088/analytics/api",
				method: "OPTIONS" } );
				results[ 0 ][ 1 ].headers.Accept.should.equal( "application/hal.v1+json" );
			} );
		} );
	} );

	describe( "when using a halon instance", function() {
		describe( "when invoking a root 'options' resource link", function() {
			var hc;
			var results = [];
			var board;
			before( function( done ) {
				hc = halon( {
					root: "http://localhost:8088/analytics/api",
					knownOptions: {
						board: [ "self", "users", "cardTypes" ],
						user: [ "self" ]
					},
					adapter: adapterFactory( results ),
					version: 3
				} );
				hc.onReady( function( hc ) {
					hc._actions.board.self( { id: 101 } ).then( function( bd ) {
						board = bd;
						done();
					} );
				} );
			} );
			it( "should pass expected arguments to the adapter", function() {
				results[ 2 ][ 0 ].should.eql( {
					href: "/analytics/api/board/101",
					method: "GET",
					templated: true
				} );
				results[ 2 ][ 1 ].should.eql( {
					data: { id: 101 },
					headers: { Accept: "application/hal.v3+json" }
				} );
			} );
			it( "should create _actions on returned resource", function() {
				( typeof board._actions.self ).should.equal( "function" );
				( typeof board._actions.minimal ).should.equal( "function" );
				( typeof board._actions.users ).should.equal( "function" );
				( typeof board._actions.cardTypes ).should.equal( "function" );
				( typeof board._actions.classesOfService ).should.equal( "function" );
				( typeof board._actions.lanes ).should.equal( "function" );
			} );
			it( "should return expected resource data", function() {
				var propsToCheck = [ "_links", "id", "title", "description", "classOfServiceEnabled", "organizationId", "laneTypes", "laneClassTypes", "tags", "priorities" ];
				_.each( expectedBoardResponse, function( val, key ) {
					if ( propsToCheck.indexOf( key ) !== -1 ) {
						val.should.eql( board[ key ] );
					}
				} );
				_.each( expectedBoardResponse.embedded, function( val, key ) {
					board[ key ].should.eql( val );
				} );
			} );
		} );
		describe( "when following a rel link on a returned resource", function() {
			var hc;
			var results = [];
			var board;
			var lanes;
			before( function( done ) {
				hc = halon( {
					root: "http://localhost:8088/analytics/api",
					knownOptions: {
						board: [ "self", "users", "cardTypes" ],
						user: [ "self" ]
					},
					adapter: adapterFactory( results ),
					version: 3
				} );
				hc.onReady( function( hc ) {
					hc._actions.board.self( { id: 101 } ).then( function( bd ) {
						board = bd;
						board._actions.lanes().then( function( l ) {
							lanes = l;
							done();
						} );
					} );
				} );
			} );
			it( "should pass expected arguments to the adapter", function() {
				results[ 4 ][ 0 ].should.eql( {
					href: "/analytics/api/board/101/lane",
					method: "GET"
				} );
				results[ 4 ][ 1 ].should.eql( { data: {}, headers: { Accept: "application/hal.v3+json" } } );
			} );
			it( "should create _actions on returned resource", function() {
				( typeof lanes._actions.self ).should.equal( "function" );
				( typeof lanes._actions.minimal ).should.equal( "function" );
				( typeof lanes._actions.users ).should.equal( "function" );
				( typeof lanes._actions.cardTypes ).should.equal( "function" );
				( typeof lanes._actions.classesOfService ).should.equal( "function" );
				( typeof lanes._actions.lanes ).should.equal( "function" );
			} );
			it( "should return expected resource data", function() {
				var propsToCheck = [ "_links", "id" ];
				_.each( expectedBoardResponse, function( val, key ) {
					if ( propsToCheck.indexOf( key ) !== -1 ) {
						val.should.eql( board[ key ] );
					}
				} );
				_.each( expectedBoardResponse.embedded, function( val, key ) {
					board[ key ].should.eql( val );
				} );
			} );
		} );

		describe( "when using verbs that can have a request body", function() {
			describe( "when using PUT", function() {
				var hc;
				var results = [];
				var lane = {
					"id": "307",
					"name": "Lane 3",
					"description": "Lane 3 Description",
					"laneClassTypeId": 0,
					"laneTypeId": 3,
					"active": true,
					"cardLimit": [
						5,
						5
					],
					"creationDate": "2009-08-19T01:37:16.000Z",
					"index": 2,
					"boardId": "101",
					"taksBoardId": null,
					"parentLaneId": null,
					"activityId": "2"
				};
				before( function( done ) {
					hc = halon( {
						root: "http://localhost:8088/analytics/altapi",
						adapter: adapterFactory( results ),
						version: 3
					} );
					hc.onReady( function( hc ) {
						hc._actions.board.addLane( lane ).then( function() {
							done();
						} );
					} );
				} );
				it( "should pass expected arguments to the adapter", function() {
					results[ 2 ][ 0 ].should.eql( {
						href: "/analytics/api/board/101/lane/307",
						method: "PUT",
						templated: true
					} );
					results[ 2 ][ 1 ].should.eql( { data: lane, headers: { Accept: "application/hal.v3+json" } } );
				} );
			} );
		} );

		describe( "when using the client instance as a function", function() {
			var hc;
			var results = [];
			before( function() {
				hc = halon( {
					root: "http://localhost:8088/analytics/api",
					adapter: adapterFactory( results )
				} );
			} );
			it( "should allow for parallel resource link invocations", function( done ) {
				hc.onReady( function( hc ) {
					hc(
						hc._actions.user.self( { id: 1 } ),
						hc._actions.board.self( { id: 101 } ),
						hc._actions.board.cardTypes( { id: 101 } )
					).then( function( responses ) {
						var userReponse = responses[ 0 ];
						var boardResponse = responses[ 1 ];
						var cardTypesReponse = responses[ 2 ];
						// remove the _actions prop so we can do an `eql` comparison
						delete userReponse._actions;
						delete boardResponse._actions;
						delete cardTypesReponse._actions;
						userReponse.should.eql( expectedUserResponse );
						boardResponse.should.eql( expectedBoardResponse );
						cardTypesReponse.should.eql( expectedCardTypeResponse );
						done();
					} );
				} );
			} );
		} );
	} );
} );