<script>
  let baseUrl = `https://avatars.dicebear.com/api/avataaars/${Math.floor(
    Math.random() * 999000999000999 + 1
  )}.svg`;

  const options = {
    top: ["longHair", "shortHair", "eyepatch", "hat", "hijab", "turban"],
    hatColor: ["black", "blue", "gray", "heather", "pastel", "pink", "red"],
    hairColor: [
      "auburn",
      "black",
      "blonde",
      "brown",
      "pastel",
      "platinum",
      "red",
      "gray",
    ],
    clothesColor: [
      "black",
      "blue",
      "gray",
      "heather",
      "pastel",
      "pink",
      "red",
      "white",
    ],
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
      "winkWacky",
    ],
    eyebrow: ["default", "flat", "raised", "sad", "unibrow", "up", "frown"],
    mouth: ["default", "eating", "serious", "smile", "tongue", "twinkle"],
    skin: ["tanned", "yellow", "pale", "light", "brown", "darkBrown", "black"],
    // accessories: ['kurt', 'prescription01', 'prescription02', 'round', 'sunglasses', 'wayfarers'],
    // accessoriesColor: ['black', 'blue', 'gray', 'heather', 'pastel', 'pink', 'red', 'white'],
    // facialHair: ['medium', 'light', 'majestic', 'fancy', 'magnum'],
    // facialHairColor: ['auburn', 'black', 'blonde', 'brown', 'pastel', 'platinum', 'red', 'gray'],
    // clotheType: ['blazer', 'sweater', 'shirt', 'hoodie', 'overall'],
  };

  let index = {
    top: Math.floor(Math.random() * options.top.length),
    hatColor: Math.floor(Math.random() * options.hatColor.length),
    hairColor: Math.floor(Math.random() * options.hairColor.length),
    clothesColor: Math.floor(Math.random() * options.clothesColor.length),
    eyes: Math.floor(Math.random() * options.eyes.length),
    eyebrow: Math.floor(Math.random() * options.eyebrow.length),
    mouth: Math.floor(Math.random() * options.mouth.length),
    skin: Math.floor(Math.random() * options.skin.length),
    // accessories: 0,
    // accessoriesColor: 0,
    // facialHair: 0,
    // facialHairColor: 0,
    // clotheType: Math.floor((Math.random() * options.clotheType.length)),
  };

  $: top = options.top[index.top % options.top.length];
  $: hatColor = options.hatColor[index.hatColor % options.hatColor.length];
  $: hairColor = options.hairColor[index.hairColor % options.hairColor.length];
  $: clothesColor =
    options.clothesColor[index.clothesColor % options.clothesColor.length];
  $: eyes = options.eyes[index.eyes % options.eyes.length];
  $: eyebrow = options.eyebrow[index.eyebrow % options.eyebrow.length];
  $: mouth = options.mouth[index.mouth % options.mouth.length];
  $: skin = options.skin[index.skin % options.skin.length];

  $: url = `${baseUrl}?top[]=${top}&hatColor[]=${hatColor}&hairColor[]=${hairColor}&&clothesColor[]=${clothesColor}&eyes[]=${eyes}&eyebrow[]=${eyebrow}&mouth[]=${mouth}&skin[]=${skin}`;
  // 	$: accessories = options.accessories[index.accessories % options.accessories.length]
  // 	$: accessoriesColor = options.accessoriesColor[index.accessoriesColor % options.accessoriesColor.length]
  // 	$: facialHair = options.facialHair[index.facialHair % options.facialHair.length]
  // 	$: facialHairColor = options.facialHairColor[index.facialHairColor % options.facialHairColor.length]
  // 	$: clotheType = options.clotheType[index.clotheType % options.clotheType.length]

  // &clothes[]=${clothes} // doesn't work with API
  // &accessories[]=${accessories}&accessoriesColor[]=${accessoriesColor}
  // facialHair[]=${facialHair}&facialHairColor[]=${facialHairColor}

  function rotate(key) {
    index[key]++;
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.2/css/all.min.css"
  />
</svelte:head>
<div class="container">
  <div class="child">
    <h1>Hello Avatar!</h1>
  </div>
  <div class="child">
    <div class="avatar">
      <img src={url} alt="avatar" />
    </div>
    <div>
      <h2>Tap to rotate:</h2>
      <ul>
        {#each [...Object.entries(options)] as [key, vals]}
          <span
            on:click={() => {
              index[key] += 1;
              console.log(
                `${key} to ${options[key][index[key] % options[key].length]}`
              );
            }}
          >
            <li>{key}</li></span
          >
        {/each}
      </ul>
    </div>
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
  }
  .child {
    margin: 0 auto;
    display: flex;
    flex-direction: row;
  }
  .avatar {
    width: 40vw;
    margin: auto;
  }
  ul {
    padding: 0.2em 0 0 0em;
    margin: 0 0 0 0em;
    list-style: none;
  }
  li:before {
    font: normal normal normal 1em/1 FontAwesome;
    /*     font-family: 'FontAwesome'; */
    content: "\f074";
    margin: 0 5px 0 -15px;
    color: #555;
  }
</style>
