<template>
  <div>
    <h2>Social Media Caption Generation</h2>
    <a-card style="width: 100%" :style="{ backgroundColor: 'white', padding: '20px' }">
      <a-form>
        <a-row :gutter="[16, 16]" style="margin-top: 5px">
          <a-col style="width: 100%">
            <label style="float: left">Topic/Place/Food (Objective of Caption)</label>
            <a-input v-model:value="captionTopic" placeholder="E.g. Knitting/The Blue Wharf/Fried Chicken"></a-input>
          </a-col>
          <a-col style="width: 100%">
            <label style="float: left">Key Phrases</label><br />
            <a-input style="width: 400px; float: left" v-model:value="keyPhrase" placeholder="E.g. Lobster great, service polite, prices good"></a-input>
            <a-button type="primary" style="float: left; margin-left: 5px" @click.native="addPhrases">Add</a-button>
          </a-col>
          <a-col style="width: 100%">
            <div style="float: left">
              <span>Added Phrases: </span>
              <span style="margin: 0" v-for="(item, index) in keyPhrases" :key="index">
                <span v-if="index != keyPhrases.length - 1">{{ item }}, </span>
                <span v-else>{{ item }}</span>
              </span>
            </div>
          </a-col>
        </a-row>
        <a-divider />
        <a-row :gutter="[36, 36]" type="flex" justify="end">
          <a-col style="margin-top: 24px">
            <a-button @click.native="clearAll">Clear All</a-button>
            <a-button type="primary" @click.native="generateCaption" style="margin-left: 10px">Generate Caption</a-button>
          </a-col>
        </a-row>
      </a-form>
    </a-card>

    <a-card style="width: 100%" :style="{ backgroundColor: 'white', padding: '20px' }">
      <a-form>
        <a-row :gutter="[16, 16]">
          <a-col>
            <h1 style="font-weight: bold; font-size: 20px">Caption Generated</h1>
          </a-col>
        </a-row>
        <a-row :gutter="[16, 16]" style="margin-top: 5px">
          <a-col>
            <a-descriptions bordered>
              <a-descriptions-item>
                {{ outputCaption }}
              </a-descriptions-item>
            </a-descriptions>
          </a-col>
        </a-row>
      </a-form>
    </a-card>
  </div>
</template>
<script>
import { defineComponent, ref, onMounted } from "vue"
const { VITE_API_KEY } = import.meta.env
import {
  UserOutlined,
  LaptopOutlined,
  NotificationOutlined,
} from "@ant-design/icons-vue"
export default defineComponent({
  components: {
    UserOutlined,
    LaptopOutlined,
    NotificationOutlined,
  },
  setup() {
    let title1 = ref("")
    let article1 = ref("")
    let title2 = ref("")
    let article2 = ref("")
    let title3 = ref("")
    let article3 = ref("")
    let inputTitle = ref("")
    let outputTitle = ref("")
    let outputArticle = ref("")
    let outputCaption = ref("")
    let captionTopic = ref("")
    let keyPhrases = ref([])
    let keyPhrase = ref("")

    let spinning = ref(false)

    let OPENAI_API_KEY = ref("")

    const activeKey = ref([])
    const text = `A dog is a type of domesticated animal.Known for its loyalty and faithfulness,it can be found as a welcome guest in many households across the world.`

    onMounted(async () => {
      // console.log("VITE_API_KEY",VITE_API_KEY)
    })

    const delayTime = ref(500)

    const changeSpinning = () => {
      spinning.value = !spinning.value
    }
    let spinningKey = ref(0)

    const generateArticle = async () => {

      changeSpinning()
      //get data from api
      let myHeaders = new Headers()
      myHeaders.append("Authorization", `Bearer ${VITE_API_KEY}`)
      myHeaders.append("Content-Type", "application/json")

      let raw = JSON.stringify({
        // prompt: `${title1.value}\n${article2.value}\n\n${title2.value}\n${article2.value}\n\n${title3.value}\n${article3.value}\n\n${inputTitle.value}\n`,
        prompt: `${title1.value}\n${article1.value}\n\n${title2.value}\n${article2.value}\n\n${title3.value}\n${article3.value}\n\n${inputTitle.value}\n`,
        temperature: 1.0,
        max_tokens: 500,
        top_p: 0.1,
        frequency_penalty: 0.8,
        presence_penalty: 1.0,
        stop: ["\n\n"]
      })

      let requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      }

      try {
        const response = await fetch(
          `https://api.openai.com/v1/engines/davinci/completions`,
          requestOptions
        )
        const result = await response.json()
        changeSpinning()
        console.log("result", result)
        outputTitle.value = inputTitle.value
        outputArticle.value = result.choices[0].text
      } catch (e) {
        console.log("Generate Article Error", e.toString())
      }
      clearAll()
    }

    const generateCaption = async () => {
      changeSpinning()
      //get data from api
      let myHeaders = new Headers()
      myHeaders.append("Authorization", `Bearer ${VITE_API_KEY}`)
      myHeaders.append("Content-Type", "application/json")

      for (let item in keyPhrases.value) {
        if (item != keyPhrases.value.length - 1) {
          allPhrases.value += keyPhrases.value[item] + ", "
        } else {
          allPhrases.value += keyPhrases.value[item]
        }
      }

      let raw = JSON.stringify({
        prompt: `Write a social media review based on these notes:\n\nName: ${captionTopic.value}\n${allPhrases.value}\n\nReview:\n\n`,
        temperature: 0.3,
        max_tokens: 100,
        top_p: 1,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      })

      let requestOptions = {
        method: "POST",
        headers: myHeaders,
        body: raw,
        redirect: "follow",
      }

      try {
        const response = await fetch(
          `https://api.openai.com/v1/engines/davinci-instruct-beta/completions`,
          requestOptions
        )
        const result = await response.json()
        changeSpinning()
        console.log("result", result)
        outputCaption.value = result.choices[0].text
        clearAllCaptionInput()
      } catch (e) {
        console.log("Generate Article Error", e.toString())
      }
    }

    const clearAll = () => {
      title1.value = ""
      title2.value = ""
      title3.value = ""
      article1.value = ""
      article2.value = ""
      article3.value = ""
      inputTitle.value = ""
    }

    const clearAllCaptionInput = () => {
      captionTopic.value = ""
      keyPhrases.value = []
      keyPhrase.value = ""
    }

    let allPhrases = ref("")

    const addPhrases = () => {
      keyPhrases.value.push(keyPhrase.value)
      keyPhrase.value = ""
    }

    return {
      title1,
      article1,
      title2,
      article2,
      title3,
      article3,
      inputTitle,
      outputTitle,
      outputArticle,
      outputCaption,
      captionTopic,
      keyPhrases,
      keyPhrase,
      addPhrases,
      allPhrases,

      spinning,

      clearAll,
      clearAllCaptionInput,
      delayTime,
      generateArticle,
      generateCaption,
      changeSpinning,
      spinningKey,
      selectedKeys1: ref(["2"]),
      selectedKeys2: ref(["1"]),
      openKeys: ref(["sub1"]),

      activeKey,
      text,
    }
  },
})
</script>
<style>
#components-layout-demo-top-side .logo {
  float: left;
  width: 120px;
  height: 31px;
  margin: 16px 24px 16px 0;
  background: rgba(255, 255, 255, 0.3);
}

.ant-row-rtl #components-layout-demo-top-side .logo {
  float: right;
  margin: 16px 0 16px 24px;
}

.site-layout-background {
  background: #fff;
}

label {
  font-weight: 500;
}
</style>