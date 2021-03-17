<script>
    import { tweened } from "svelte/motion";
    import { cubicOut, expoOut } from "svelte/easing";

    export let duration = 1500;
    export let strokeSize = 200;
    let x = strokeSize / 2;
    let y = strokeSize / 2;
    let circleCss = `stroke-width:${strokeSize};`;

    function expand(node, params) {
        const {
            delay = 0,
            duration = 400,
            easing = cubicOut,
            strokeSize = 100,
        } = params;

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

    const loop = (time) => {
        timeout = setTimeout(() => {
            expanding = !expanding;
            loop(duration);
        }, time);
    };

    loop(1500);
</script>

<svg>
    {#if expanding}
        <circle
            cx={x}
            cy={y}
            r="0.1"
            in:expand={{ duration, delay: 0, easing: expoOut, strokeSize }}
            style={circleCss}
        />
        <circle
            cx={x}
            cy={y}
            r="0.1"
            in:expand={{
                duration,
                delay: (duration * 1) / 4.5,
                easing: expoOut,
                strokeSize,
            }}
            style={circleCss}
        />
        <circle
            cx={x}
            cy={y}
            r="0.1"
            in:expand={{
                duration,
                delay: (duration * 2) / 4.5,
                easing: expoOut,
                strokeSize,
            }}
            style={circleCss}
        />
    {/if}
</svg>

<style>
    svg {
        width: 100%;
        height: 100%;
        fill: #0000;
    }
    circle {
        stroke: #2ec73d;
        fill: #2ec73d;
    }
</style>
