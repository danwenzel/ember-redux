import { run } from '@ember/runloop';
import { connect } from 'ember-redux';
import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { render } from '@ember/test-helpers';
import Component from '@ember/component';

var redux;

module('integration: connect test', function(hooks) {
  setupRenderingTest(hooks);

  hooks.beforeEach(function() {
    redux = this.owner.lookup('service:redux');
  });

  test('should render parent component with one state and child component with another', async function(assert) {
    await render(hbs`{{count-list}}`);
    let $parent = this.$('.parent-state');
    let $child = this.$('.child-state');
    assert.equal($parent.text(), 0);
    assert.equal($child.text(), 9);
    run(() => {
      this.$('.btn-up').trigger('click');
    });
    assert.equal($parent.text(), 1);
    assert.equal($child.text(), 9);
    run(() => {
      this.$('.btn-up').trigger('click');
    });
    assert.equal($parent.text(), 2);
    assert.equal($child.text(), 9);
    run(() => {
      this.$('.btn-down').trigger('click');
    });
    assert.equal($parent.text(), 2);
    assert.equal($child.text(), 8);
    run(() => {
      this.$('.btn-down').trigger('click');
    });
    assert.equal($parent.text(), 2);
    assert.equal($child.text(), 7);
  });

  test('should render attrs', async function(assert) {
    assert.expect(2);
    this.set('myName', 'Dustin');
    await render(hbs`{{count-list name=myName}}`);

    assert.equal(this.$('.greeting').text(), 'Welcome back, Dustin!', 'should render attrs provided to component');

    this.set('myName', 'Toran');

    assert.equal(this.$('.greeting').text(), 'Welcome back, Toran!', 'should rerender component if attrs change');
  });

  test('stateToComputed will provide `this` context that is the component instance (when not using [phat]Arrow function)', async function(assert) {
    assert.expect(1);

    await render(hbs`{{count-list}}`);

    assert.equal(this.$('.serviced').text(), 'true', 'should render the prop provided by component instance');
  });

  test('stateToComputed can be used with component level CP if notifyPropertyChange invoked during didUpdateAttrs', async function(assert) {
    assert.expect(2);

    this.set('dynoNameValue', 'Toran');
    await render(hbs`{{count-list dynoNameValue=dynoNameValue}}`);

    assert.equal(this.$('.dyno').text(), 'name: Toran', 'should render the local component value');

    this.set('dynoNameValue', 'Tom');

    assert.equal(this.$('.dyno').text(), 'name: Tom', 'should render new value when local component CP changed and notifyPropertyChange invoked');
  });

  test('stateToComputed is not invoked extraneously', async function(assert) {
    let callCount = 0;
    const stateToComputed = () => {
      callCount++;
      return { callCount };
    }
    this.owner.register('component:test-component', connect(stateToComputed)(Component.extend({
      layout: hbs`{{callCount}}`
    })));

    await render(hbs`{{test-component attr=attr}}`);
    assert.equal(this.$().text(), '1');
    assert.equal(callCount, 1);

    this.set('attr', 'some-change');
    assert.equal(this.$().text(), '2');
    assert.equal(callCount, 2);

    redux.dispatch({ type: 'FAKE-ACTION' });
    assert.equal(this.$().text(), '3');
    assert.equal(callCount, 3);
  });

  test('the component should truly be extended meaning actions map over as you would expect', async function(assert) {
    await render(hbs`{{count-list}}`);
    let $random = this.$('.random-state');
    assert.equal($random.text(), '');
    run(() => {
      this.$('.btn-random').trigger('click');
    });
    assert.equal($random.text(), 'blue');
  });

  test('each computed is truly readonly', async function(assert) {
    assert.expect(1);
    await render(hbs`{{count-list}}`);
    assert.expectAssertion(() => {
      this.$('.btn-alter').trigger('click');
    }, 'Assertion Failed: Cannot set redux property "low". Try dispatching a redux action instead.');
  });

  test('lifecycle hooks are still invoked', async function(assert) {
    assert.expect(3);
    this.owner.register('component:test-component', connect()(Component.extend({
      init() {
        assert.ok(true, 'init is invoked');
        this._super(...arguments);
      },

      didUpdateAttrs() {
        assert.ok(true, 'didUpdateAttrs should be invoked');
        this._super(...arguments);
      },

      willDestroy() {
        assert.ok(true, 'willDestroy is invoked');
        this._super(...arguments);
      }
    })));

    await render(hbs`{{test-component name=name}}`);

    this.set('name', 'Dustin');
  });

  test('lifecycle hooks are still invoked for es2015 class based components', async function(assert) {
    assert.expect(5);

    const stateToComputed = (state, attrs) => ({
      number: attrs.name
    });

    class FakeClazz extends Component {
      get layout() {
        return hbs`<span class="name">{{number}}</span>`;
      }

      constructor() {
        assert.ok(true, 'constructor is invoked');
        super(...arguments);
      }

      didUpdateAttrs() {
        assert.ok(true, 'didUpdateAttrs should be invoked');
        // super.didUpdateAttrs(...arguments);
      }

      willDestroy() {
        assert.ok(true, 'willDestroy is invoked');
        super.willDestroy(...arguments);
      }
    }

    this.owner.register('component:test-clazz', connect(stateToComputed)(FakeClazz));

    await render(hbs`{{test-clazz name=name}}`);
    assert.equal(this.$('.name').text(), '');

    this.set('name', 'Toran');
    assert.equal(this.$('.name').text(), 'Toran');
  });

  test('without didUpdateAttrs lifecycle defined connect will not throw runtime error', async function(assert) {
    assert.expect(2);

    const stateToComputed = (state, attrs) => ({
      number: attrs.name
    });

    class FakeClazz extends Component {
      get layout() {
        return hbs`<span class="name">{{number}}</span>`;
      }
    }

    this.owner.register('component:test-clazz', connect(stateToComputed)(FakeClazz));

    await render(hbs`{{test-clazz name=name}}`);
    assert.equal(this.$('.name').text(), '');

    this.set('name', 'Christopher');
    assert.equal(this.$('.name').text(), 'Christopher');
  });

  test('connecting dispatchToActions only', async function(assert) {
    assert.expect(2);
    const dispatchToActions = () => {};

    this.owner.register('component:test-component-1', connect(null, dispatchToActions)(Component.extend({
      init() {
        this._super(...arguments);
        assert.ok(true, 'should be able to connect components passing `null` to stateToComputed');
      }
    })));

    this.owner.register('component:test-component-2', connect(undefined, dispatchToActions)(Component.extend({
      init() {
        this._super(...arguments);
        assert.ok(true, 'should be able to connect components passing `undefined` to stateToComputed');
      }
    })));

    await render(hbs`{{test-component-1}}`);
    await render(hbs`{{test-component-2}}`);
  });

  test('connecting dispatchToActions as object should dispatch action', async function(assert) {
    assert.expect(2);

    const dispatchToActions = {
      up() {
        assert.ok(true, 'should be able to pass object of functions to dispatchToActions');
        return {
          type: 'UP'
        };
      },
      down() {
        assert.ok(true, 'should be able to pass object of functions to dispatchToActions');
        return {
          type: 'DOWN'
        };
      }
    };

    this.owner.register('component:test-dispatch-action-object', connect(undefined, dispatchToActions)(Component.extend({
      init() {
        this._super(...arguments);
      },
      layout: hbs`
        <button class="btn-up" onclick={{action "up"}}>up</button>
        <button class="btn-down" onclick={{action "down"}}>up</button>
      `
    })));

    await render(hbs`{{test-dispatch-action-object}}`);
    run(() => {
      this.$('.btn-up').trigger('click');
      this.$('.btn-down').trigger('click');
    });
  });

  test('connect provides an Ember Component for you by default', async function(assert) {
    this.owner.register('template:components/foo-bar', hbs`{{name}}`);

    const stateToComputed = () => ({ name: 'byDefault?' });

    this.owner.register('component:foo-bar', connect(stateToComputed)());

    await render(hbs`{{foo-bar}}`);

    assert.equal(this.$().text(), 'byDefault?');
  });

  test('stateToComputed supports a static function', async function(assert) {
    const stateToComputed = () => ({ id: 'static-selector' });

    this.owner.register('component:component-with-static-selector', connect(stateToComputed)(Component.extend({
      layout: hbs`{{id}}`
    })));

    await render(hbs`{{component-with-static-selector}}`);

    assert.equal(this.$().text(), 'static-selector');
  });

  test('stateToComputed supports a factory function', async function(assert) {
    let createdCount = 0;
    const stateToComputedFactory = () => {
      createdCount++;
      return () => ({ id: `selector-${createdCount}` })
    }

    this.owner.register('component:component-with-selector-factory', connect(stateToComputedFactory)(Component.extend({
      layout: hbs`{{id}}`
    })));

    await render(hbs`{{component-with-selector-factory}} {{component-with-selector-factory}}`);

    assert.equal(createdCount, 2);
    assert.equal(this.$().text(), 'selector-1 selector-2');
  });
});
