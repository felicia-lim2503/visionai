<template>
  <div>
    <h2>Generate/Refurbish Surveyees' Responses</h2>
    <a-card style="width: 100%" :style="{ backgroundColor: 'white', padding: '20px' }">
      <a-row :gutter="[16, 16]" style="margin-top: 5px">
        <a-col style="width: 100%">
          <form @submit.prevent="onSubmit" enctype="multipart/form-data">
            <!-- Doc Photo -->
            <div class="field">
              <label class="label has-text-left">Survey Inputs</label>
              <div class="file has-name">
                <label class="file-label">
                  <input class="file-input" type="file" id="file1" name="file1" @change="uploadDoc" required />
                  <span class="file-cta is-Green">
                    <!-- <font-awesome-icon class="icon" :icon="['fa', 'cloud-arrow-up']" /> -->
                    <span class="file-label"> Choose File </span>
                  </span>
                  <span class="file-name"> {{ fileTitle }}</span>
                </label>
              </div>
            </div>

            <div class="field is-grouped is-justify-content-flex-end">
              <div class="control">
                <button class="button is-primary" type="submit">Upload</button>
              </div>
              <div class="control">
                <button class="button is-red" @click="$router.push('/settings')">Cancel</button>
              </div>
            </div>
          </form>
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>
<script>
import { defineComponent, ref, onMounted } from 'vue'
const { VITE_API_KEY, VITE_APP_NAME, VITE_API_URL } = import.meta.env
import { message } from 'ant-design-vue'
import { UploadOutlined } from '@ant-design/icons-vue'
import * as http from '/http.js'

export default defineComponent({
  components: {
    UploadOutlined
  },
  setup() {
    let spinning = ref(false)

    let OPENAI_API_KEY = ref('')

    onMounted(async () => {
      //   console.log('VITE_API_KEY', VITE_API_KEY)
    })

    const uploadFile = (file) => {
      // add file to FormData object
      const fd = new FormData()
      fd.append('avatar', file)

      // send `POST` request
      fetch(`${VITE_API_URL}/api/app-template/fileRouter/saveFile`, {
        method: 'POST',
        body: fd
      })
        .then((res) => res.json())
        .then((json) => console.log(json))
        .catch((err) => console.error(err))
    }

    const delayTime = ref(500)

    const changeSpinning = () => {
      spinning.value = !spinning.value
    }
    let spinningKey = ref(0)

    let uploadedFile = ref()

    const fileList = ref([])

    let fileTitle = ref()
    let fileValue = ref()

    const uploadDoc = (event) => {
      let file = event.target.files[0]
      if (file) {
        fileTitle.value = file.name
        fileValue.value = file
      }
    }

    const onSubmit = async () => {
      try {
        let formData = new FormData()
        formData.append('file1', fileValue.value)
        let { data } = await http.post(`${VITE_API_URL}/api/app-template/fileRouter/saveFile`, formData)
        setTimeout( () => {
          console.log('data', data)
          exportToCsv('output.csv', data)
        }, 10000)
      } catch (e) {
        if (e.status == 400) {
          console.log('error!')
        }
      }
    }

    const exportToCsv = (filename, rows) => {
      console.log("exportToCsv called")
      let processRow = (row) => {
        let finalVal = ''
        for (let j = 0; j < row.length; j++) {
          let innerValue = row[j] === null ? '' : row[j].toString()
          if (row[j] instanceof Date) {
            innerValue = row[j].toLocaleString()
          }
          let result = innerValue.replace(/"/g, '""')
          if (result.search(/("|,|\n)/g) >= 0) result = '"' + result + '"'
          if (j > 0) finalVal += ','
          finalVal += result
        }
        return finalVal + '\n'
      }

      let csvFile = ''
      for (let i = 0; i < rows.length; i++) {
        csvFile += processRow(rows[i])
      }

      let blob = new Blob([csvFile], { type: 'text/csv;charset=utf-8;' })
      if (navigator.msSaveBlob) {
        // IE 10+
        navigator.msSaveBlob(blob, filename)
      } else {
        let link = document.createElement('a')
        if (link.download !== undefined) {
          // feature detection
          // Browsers that support HTML5 download attribute
          let url = URL.createObjectURL(blob)
          link.setAttribute('href', url)
          link.setAttribute('download', filename)
          link.style.visibility = 'hidden'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }
      }
    }

    return {
      exportToCsv,
      fileValue,
      fileTitle,

      spinning,

      fileList,

      uploadedFile,

      uploadFile,
      uploadDoc,
      onSubmit
    }
  }
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
