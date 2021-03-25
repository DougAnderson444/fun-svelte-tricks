
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.35.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\Avatar\Avatar.svelte generated by Svelte v3.35.0 */

    const { Object: Object_1, console: console_1 } = globals;
    const file$2 = "src\\components\\Avatar\\Avatar.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i][0];
    	child_ctx[15] = list[i][1];
    	return child_ctx;
    }

    // (110:8) {#each [...Object.entries(options)] as [key, vals]}
    function create_each_block(ctx) {
    	let span;
    	let li;
    	let t_value = /*key*/ ctx[14] + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[11](/*key*/ ctx[14]);
    	}

    	const block = {
    		c: function create() {
    			span = element("span");
    			li = element("li");
    			t = text(t_value);
    			attr_dev(li, "class", "svelte-j95zv3");
    			add_location(li, file$2, 118, 12, 4449);
    			add_location(span, file$2, 110, 10, 4213);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, li);
    			append_dev(li, t);

    			if (!mounted) {
    				dispose = listen_dev(span, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(110:8) {#each [...Object.entries(options)] as [key, vals]}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let link;
    	let t0;
    	let div4;
    	let div0;
    	let h1;
    	let t2;
    	let div3;
    	let div1;
    	let img;
    	let img_src_value;
    	let t3;
    	let div2;
    	let h2;
    	let t5;
    	let ul;
    	let each_value = [...Object.entries(/*options*/ ctx[2])];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			div4 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Hello Avatar!";
    			t2 = space();
    			div3 = element("div");
    			div1 = element("div");
    			img = element("img");
    			t3 = space();
    			div2 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Tap to rotate:";
    			t5 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.2/css/all.min.css");
    			add_location(link, file$2, 93, 2, 3765);
    			add_location(h1, file$2, 100, 4, 3955);
    			attr_dev(div0, "class", "child svelte-j95zv3");
    			add_location(div0, file$2, 99, 2, 3930);
    			if (img.src !== (img_src_value = /*url*/ ctx[1])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "avatar");
    			add_location(img, file$2, 104, 6, 4044);
    			attr_dev(div1, "class", "avatar svelte-j95zv3");
    			add_location(div1, file$2, 103, 4, 4016);
    			add_location(h2, file$2, 107, 6, 4105);
    			attr_dev(ul, "class", "svelte-j95zv3");
    			add_location(ul, file$2, 108, 6, 4136);
    			add_location(div2, file$2, 106, 4, 4092);
    			attr_dev(div3, "class", "child svelte-j95zv3");
    			add_location(div3, file$2, 102, 2, 3991);
    			attr_dev(div4, "class", "container svelte-j95zv3");
    			add_location(div4, file$2, 98, 0, 3903);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, h1);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, img);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, h2);
    			append_dev(div2, t5);
    			append_dev(div2, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*url*/ 2 && img.src !== (img_src_value = /*url*/ ctx[1])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*index, Object, options, console*/ 5) {
    				each_value = [...Object.entries(/*options*/ ctx[2])];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let top;
    	let hatColor;
    	let hairColor;
    	let clothesColor;
    	let eyes;
    	let eyebrow;
    	let mouth;
    	let skin;
    	let url;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Avatar", slots, []);
    	let baseUrl = `https://avatars.dicebear.com/api/avataaars/${Math.floor(Math.random() * 999000999000999 + 1)}.svg`;

    	const options = {
    		top: ["longHair", "shortHair", "eyepatch", "hat", "hijab", "turban"],
    		hatColor: ["black", "blue", "gray", "heather", "pastel", "pink", "red"],
    		hairColor: ["auburn", "black", "blonde", "brown", "pastel", "platinum", "red", "gray"],
    		clothesColor: ["black", "blue", "gray", "heather", "pastel", "pink", "red", "white"],
    		eyes: [
    			"close",
    			"default",
    			"roll",
    			"happy",
    			"hearts",
    			"side",
    			"squint",
    			"surprised",
    			"wink",
    			"winkWacky"
    		],
    		eyebrow: ["default", "flat", "raised", "sad", "unibrow", "up", "frown"],
    		mouth: ["default", "eating", "serious", "smile", "tongue", "twinkle"],
    		skin: ["tanned", "yellow", "pale", "light", "brown", "darkBrown", "black"]
    	}; // accessories: ['kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers'],
    	// accessoriesColor: ['black', 'blue', 'gray', 'heather', 'pastel', 'pink', 'red', 'white'],
    	// facialHair: ['medium', 'light', 'majestic', 'fancy', 'magnum'],

    	// facialHairColor: ['auburn', 'black', 'blonde', 'brown', 'pastel', 'platinum', 'red', 'gray'],
    	// clotheType: ['blazer', 'sweater', 'shirt', 'hoodie', 'overall'],
    	let index = {
    		top: Math.floor(Math.random() * options.top.length),
    		hatColor: Math.floor(Math.random() * options.hatColor.length),
    		hairColor: Math.floor(Math.random() * options.hairColor.length),
    		clothesColor: Math.floor(Math.random() * options.clothesColor.length),
    		eyes: Math.floor(Math.random() * options.eyes.length),
    		eyebrow: Math.floor(Math.random() * options.eyebrow.length),
    		mouth: Math.floor(Math.random() * options.mouth.length),
    		skin: Math.floor(Math.random() * options.skin.length)
    	}; // accessories: 0,
    	// accessoriesColor: 0,
    	// facialHair: 0,

    	// 	$: accessories = options.accessories[index.accessories % options.accessories.length]
    	// 	$: accessoriesColor = options.accessoriesColor[index.accessoriesColor % options.accessoriesColor.length]
    	// 	$: facialHair = options.facialHair[index.facialHair % options.facialHair.length]
    	// 	$: facialHairColor = options.facialHairColor[index.facialHairColor % options.facialHairColor.length]
    	// 	$: clotheType = options.clotheType[index.clotheType % options.clotheType.length]
    	// &clothes[]=${clothes} // doesn't work with API
    	// &accessories[]=${accessories}&accessoriesColor[]=${accessoriesColor}
    	// facialHair[]=${facialHair}&facialHairColor[]=${facialHairColor}
    	function rotate(key) {
    		$$invalidate(0, index[key]++, index);
    	}

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Avatar> was created with unknown prop '${key}'`);
    	});

    	const click_handler = key => {
    		$$invalidate(0, index[key] += 1, index);
    		console.log(`${key} to ${options[key][index[key] % options[key].length]}`);
    	};

    	$$self.$capture_state = () => ({
    		baseUrl,
    		options,
    		index,
    		rotate,
    		top,
    		hatColor,
    		hairColor,
    		clothesColor,
    		eyes,
    		eyebrow,
    		mouth,
    		skin,
    		url
    	});

    	$$self.$inject_state = $$props => {
    		if ("baseUrl" in $$props) $$invalidate(12, baseUrl = $$props.baseUrl);
    		if ("index" in $$props) $$invalidate(0, index = $$props.index);
    		if ("top" in $$props) $$invalidate(3, top = $$props.top);
    		if ("hatColor" in $$props) $$invalidate(4, hatColor = $$props.hatColor);
    		if ("hairColor" in $$props) $$invalidate(5, hairColor = $$props.hairColor);
    		if ("clothesColor" in $$props) $$invalidate(6, clothesColor = $$props.clothesColor);
    		if ("eyes" in $$props) $$invalidate(7, eyes = $$props.eyes);
    		if ("eyebrow" in $$props) $$invalidate(8, eyebrow = $$props.eyebrow);
    		if ("mouth" in $$props) $$invalidate(9, mouth = $$props.mouth);
    		if ("skin" in $$props) $$invalidate(10, skin = $$props.skin);
    		if ("url" in $$props) $$invalidate(1, url = $$props.url);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*index*/ 1) {
    			// facialHairColor: 0,
    			// clotheType: Math.floor((Math.random() * options.clotheType.length)),
    			$$invalidate(3, top = options.top[index.top % options.top.length]);
    		}

    		if ($$self.$$.dirty & /*index*/ 1) {
    			$$invalidate(4, hatColor = options.hatColor[index.hatColor % options.hatColor.length]);
    		}

    		if ($$self.$$.dirty & /*index*/ 1) {
    			$$invalidate(5, hairColor = options.hairColor[index.hairColor % options.hairColor.length]);
    		}

    		if ($$self.$$.dirty & /*index*/ 1) {
    			$$invalidate(6, clothesColor = options.clothesColor[index.clothesColor % options.clothesColor.length]);
    		}

    		if ($$self.$$.dirty & /*index*/ 1) {
    			$$invalidate(7, eyes = options.eyes[index.eyes % options.eyes.length]);
    		}

    		if ($$self.$$.dirty & /*index*/ 1) {
    			$$invalidate(8, eyebrow = options.eyebrow[index.eyebrow % options.eyebrow.length]);
    		}

    		if ($$self.$$.dirty & /*index*/ 1) {
    			$$invalidate(9, mouth = options.mouth[index.mouth % options.mouth.length]);
    		}

    		if ($$self.$$.dirty & /*index*/ 1) {
    			$$invalidate(10, skin = options.skin[index.skin % options.skin.length]);
    		}

    		if ($$self.$$.dirty & /*top, hatColor, hairColor, clothesColor, eyes, eyebrow, mouth, skin*/ 2040) {
    			$$invalidate(1, url = `${baseUrl}?top[]=${top}&hatColor[]=${hatColor}&hairColor[]=${hairColor}&&clothesColor[]=${clothesColor}&eyes[]=${eyes}&eyebrow[]=${eyebrow}&mouth[]=${mouth}&skin[]=${skin}`);
    		}
    	};

    	return [
    		index,
    		url,
    		options,
    		top,
    		hatColor,
    		hairColor,
    		clothesColor,
    		eyes,
    		eyebrow,
    		mouth,
    		skin,
    		click_handler
    	];
    }

    class Avatar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Avatar",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function expoOut(t) {
        return t === 1.0 ? t : 1.0 - Math.pow(2.0, -10.0 * t);
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function get_interpolator(a, b) {
        if (a === b || a !== a)
            return () => a;
        const type = typeof a;
        if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
            throw new Error('Cannot interpolate values of different type');
        }
        if (Array.isArray(a)) {
            const arr = b.map((bi, i) => {
                return get_interpolator(a[i], bi);
            });
            return t => arr.map(fn => fn(t));
        }
        if (type === 'object') {
            if (!a || !b)
                throw new Error('Object cannot be null');
            if (is_date(a) && is_date(b)) {
                a = a.getTime();
                b = b.getTime();
                const delta = b - a;
                return t => new Date(a + t * delta);
            }
            const keys = Object.keys(b);
            const interpolators = {};
            keys.forEach(key => {
                interpolators[key] = get_interpolator(a[key], b[key]);
            });
            return t => {
                const result = {};
                keys.forEach(key => {
                    result[key] = interpolators[key](t);
                });
                return result;
            };
        }
        if (type === 'number') {
            const delta = b - a;
            return t => a + t * delta;
        }
        throw new Error(`Cannot interpolate ${type} values`);
    }
    function tweened(value, defaults = {}) {
        const store = writable(value);
        let task;
        let target_value = value;
        function set(new_value, opts) {
            if (value == null) {
                store.set(value = new_value);
                return Promise.resolve();
            }
            target_value = new_value;
            let previous_task = task;
            let started = false;
            let { delay = 0, duration = 400, easing = identity, interpolate = get_interpolator } = assign(assign({}, defaults), opts);
            if (duration === 0) {
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                store.set(value = target_value);
                return Promise.resolve();
            }
            const start = now() + delay;
            let fn;
            task = loop(now => {
                if (now < start)
                    return true;
                if (!started) {
                    fn = interpolate(value, new_value);
                    if (typeof duration === 'function')
                        duration = duration(value, new_value);
                    started = true;
                }
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                const elapsed = now - start;
                if (elapsed > duration) {
                    store.set(value = new_value);
                    return false;
                }
                // @ts-ignore
                store.set(value = fn(easing(elapsed / duration)));
                return true;
            });
            return task.promise;
        }
        return {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe
        };
    }

    /* src\components\Beacon\Beacon.svelte generated by Svelte v3.35.0 */
    const file$1 = "src\\components\\Beacon\\Beacon.svelte";

    // (44:4) {#if expanding}
    function create_if_block(ctx) {
    	let circle0;
    	let circle0_intro;
    	let circle1;
    	let circle1_intro;
    	let circle2;
    	let circle2_intro;

    	const block = {
    		c: function create() {
    			circle0 = svg_element("circle");
    			circle1 = svg_element("circle");
    			circle2 = svg_element("circle");
    			attr_dev(circle0, "cx", /*x*/ ctx[3]);
    			attr_dev(circle0, "cy", /*y*/ ctx[4]);
    			attr_dev(circle0, "r", "0.1");
    			attr_dev(circle0, "style", /*circleCss*/ ctx[5]);
    			attr_dev(circle0, "class", "svelte-fcjozm");
    			add_location(circle0, file$1, 44, 8, 1063);
    			attr_dev(circle1, "cx", /*x*/ ctx[3]);
    			attr_dev(circle1, "cy", /*y*/ ctx[4]);
    			attr_dev(circle1, "r", "0.1");
    			attr_dev(circle1, "style", /*circleCss*/ ctx[5]);
    			attr_dev(circle1, "class", "svelte-fcjozm");
    			add_location(circle1, file$1, 51, 8, 1261);
    			attr_dev(circle2, "cx", /*x*/ ctx[3]);
    			attr_dev(circle2, "cy", /*y*/ ctx[4]);
    			attr_dev(circle2, "r", "0.1");
    			attr_dev(circle2, "style", /*circleCss*/ ctx[5]);
    			attr_dev(circle2, "class", "svelte-fcjozm");
    			add_location(circle2, file$1, 63, 8, 1560);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle0, anchor);
    			insert_dev(target, circle1, anchor);
    			insert_dev(target, circle2, anchor);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		i: function intro(local) {
    			if (!circle0_intro) {
    				add_render_callback(() => {
    					circle0_intro = create_in_transition(circle0, /*expand*/ ctx[6], {
    						duration: /*duration*/ ctx[0],
    						delay: 0,
    						easing: expoOut,
    						strokeSize: /*strokeSize*/ ctx[1]
    					});

    					circle0_intro.start();
    				});
    			}

    			if (!circle1_intro) {
    				add_render_callback(() => {
    					circle1_intro = create_in_transition(circle1, /*expand*/ ctx[6], {
    						duration: /*duration*/ ctx[0],
    						delay: /*duration*/ ctx[0] * 1 / 4.5,
    						easing: expoOut,
    						strokeSize: /*strokeSize*/ ctx[1]
    					});

    					circle1_intro.start();
    				});
    			}

    			if (!circle2_intro) {
    				add_render_callback(() => {
    					circle2_intro = create_in_transition(circle2, /*expand*/ ctx[6], {
    						duration: /*duration*/ ctx[0],
    						delay: /*duration*/ ctx[0] * 2 / 4.5,
    						easing: expoOut,
    						strokeSize: /*strokeSize*/ ctx[1]
    					});

    					circle2_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle0);
    			if (detaching) detach_dev(circle1);
    			if (detaching) detach_dev(circle2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(44:4) {#if expanding}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let svg;
    	let svg_style_value;
    	let if_block = /*expanding*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			if (if_block) if_block.c();
    			attr_dev(svg, "style", svg_style_value = `height: ${/*strokeSize*/ ctx[1]}; width: ${/*strokeSize*/ ctx[1]}`);
    			attr_dev(svg, "class", "svelte-fcjozm");
    			add_location(svg, file$1, 42, 0, 973);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			if (if_block) if_block.m(svg, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*expanding*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*expanding*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(svg, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*strokeSize*/ 2 && svg_style_value !== (svg_style_value = `height: ${/*strokeSize*/ ctx[1]}; width: ${/*strokeSize*/ ctx[1]}`)) {
    				attr_dev(svg, "style", svg_style_value);
    			}
    		},
    		i: function intro(local) {
    			transition_in(if_block);
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Beacon", slots, []);
    	let { duration = 1500 } = $$props;
    	let { strokeSize = 200 } = $$props;
    	let x = strokeSize / 2;
    	let y = strokeSize / 2;
    	let circleCss = `stroke-width:${strokeSize};`;

    	function expand(node, params) {
    		const { delay = 0, duration = 400, easing = cubicOut, strokeSize = 100 } = params;
    		const w = parseFloat(getComputedStyle(node).strokeWidth);

    		return {
    			delay,
    			duration,
    			easing,
    			css: (t, u) => `opacity: ${u}; stroke-width: ${t * w}`, //
    			
    		};
    	}

    	let expanding = false;
    	let timeout;

    	const loop = time => {
    		timeout = setTimeout(
    			() => {
    				$$invalidate(2, expanding = !expanding);
    				loop(duration);
    			},
    			time
    		);
    	};

    	loop(1500);
    	const writable_props = ["duration", "strokeSize"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Beacon> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("duration" in $$props) $$invalidate(0, duration = $$props.duration);
    		if ("strokeSize" in $$props) $$invalidate(1, strokeSize = $$props.strokeSize);
    	};

    	$$self.$capture_state = () => ({
    		tweened,
    		cubicOut,
    		expoOut,
    		duration,
    		strokeSize,
    		x,
    		y,
    		circleCss,
    		expand,
    		expanding,
    		timeout,
    		loop
    	});

    	$$self.$inject_state = $$props => {
    		if ("duration" in $$props) $$invalidate(0, duration = $$props.duration);
    		if ("strokeSize" in $$props) $$invalidate(1, strokeSize = $$props.strokeSize);
    		if ("x" in $$props) $$invalidate(3, x = $$props.x);
    		if ("y" in $$props) $$invalidate(4, y = $$props.y);
    		if ("circleCss" in $$props) $$invalidate(5, circleCss = $$props.circleCss);
    		if ("expanding" in $$props) $$invalidate(2, expanding = $$props.expanding);
    		if ("timeout" in $$props) timeout = $$props.timeout;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [duration, strokeSize, expanding, x, y, circleCss, expand];
    }

    class Beacon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { duration: 0, strokeSize: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Beacon",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get duration() {
    		throw new Error("<Beacon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set duration(value) {
    		throw new Error("<Beacon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get strokeSize() {
    		throw new Error("<Beacon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set strokeSize(value) {
    		throw new Error("<Beacon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.35.0 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let div0;
    	let t2;
    	let avatar;
    	let t3;
    	let div1;
    	let p;
    	let t5;
    	let beacon;
    	let current;
    	avatar = new Avatar({ $$inline: true });
    	beacon = new Beacon({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Some Demos!";
    			t1 = space();
    			div0 = element("div");
    			t2 = text("Avatar: ");
    			create_component(avatar.$$.fragment);
    			t3 = space();
    			div1 = element("div");
    			p = element("p");
    			p.textContent = "Beacon:";
    			t5 = space();
    			create_component(beacon.$$.fragment);
    			attr_dev(h1, "class", "svelte-61lquc");
    			add_location(h1, file, 6, 4, 129);
    			attr_dev(div0, "class", "svelte-61lquc");
    			add_location(div0, file, 7, 4, 155);
    			add_location(p, file, 9, 8, 205);
    			attr_dev(div1, "class", "svelte-61lquc");
    			add_location(div1, file, 8, 4, 190);
    			attr_dev(main, "class", "svelte-61lquc");
    			add_location(main, file, 5, 0, 117);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, div0);
    			append_dev(div0, t2);
    			mount_component(avatar, div0, null);
    			append_dev(main, t3);
    			append_dev(main, div1);
    			append_dev(div1, p);
    			append_dev(div1, t5);
    			mount_component(beacon, div1, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(avatar.$$.fragment, local);
    			transition_in(beacon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(avatar.$$.fragment, local);
    			transition_out(beacon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(avatar);
    			destroy_component(beacon);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Avatar, Beacon });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      props: {
      }
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
