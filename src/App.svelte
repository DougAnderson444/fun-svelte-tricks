<script>
    import Avatar from "./components/Avatar";
    import Beacon from "./components/Beacon";
</script>

<main>
    <h1>Some Demos!</h1>
    <div>Avatar: <Avatar /></div>
    <div>
        <p>Beacon:</p>
        <Beacon />
    </div>
</main>

<style>
    main {
        text-align: center;
        padding: 1em;
        max-width: 240px;
        margin: 0 auto;
    }
    h1 {
        color: #ff3e00;
        text-transform: uppercase;
        font-size: 4em;
        font-weight: 100;
    }
    div {
        margin: 1em;
        padding: 1em;
        border: 4px solid rgba(95, 79, 79, 0.418);
        border-radius: 2em;
    }
    @media (min-width: 640px) {
        main {
            max-width: none;
        }
    }
</style>
