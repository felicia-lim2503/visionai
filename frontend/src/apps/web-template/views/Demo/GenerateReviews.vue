<template>
  <div>
    <!-- <a-spin :spinning="spinning" :delay="delayTime" tip="Generating Responses..." size="large" :key="2"> -->
    <div id="myNav" class="overlay">
      <!-- <a href="javascript:void(0)" class="closebtn" @click="closeNav()">&times;</a> -->
      <div style="position: absolute; top: 50%; left: 45%; margin-top: -50px; margin-left: -50px; width: 100px; height: 100px">
        <p style="font-weight:bold; color: white; font-size: 18px; width: 235px; text-align:center;">Generating Responses..</p>
        <a-progress stroke-linecap="square" :percent="progressPercentage" style="width: 250px; margin-top: 10px;" /><br/>
        <a-button style="margin-top: 20px; margin-left:60px;"
          type="primary"
          @click="
            $router.push('/demo/reviews');
            closeNav()
          "
          >Cancel Upload</a-button
        >
      </div>
    </div>
    <h2 style="font-weight: bold">Refurbish Surveyees' Responses</h2>
    <a-card style="width: 100%" :style="{ backgroundColor: 'white', padding: '20px' }">
      <a-row :gutter="[16, 16]" style="margin-top: 5px">
        <a-col> <a target="_blank" @click="downloadTemplate">Download File Template</a><i> - Populate data in this template to upload</i> </a-col>
      </a-row>
      <br />
      <a-row :gutter="[16, 16]" style="margin-top: 5px">
        <a-col style="width: 100%">
          <form @submit.prevent="onSubmit" enctype="multipart/form-data">
            <div class="field">
              <div class="file has-name">
                <label class="file-label">
                  <input class="file-input" type="file" id="file1" name="file1" @change="uploadDoc" required />
                  <span class="file-cta is-Green">
                    <!-- <font-awesome-icon class="icon" :icon="['fa', 'cloud-arrow-up']" /> -->
                    <span class="file-label"> Upload Survey Input </span>
                  </span>
                  <span class="file-name"> {{ fileTitle }}</span>
                </label>
              </div>
            </div>

            <div class="field is-grouped is-justify-content-flex-start">
              <div class="control">
                <!-- <a-progress stroke-linecap="square" :percent="progressPercentage" style="width: 250px" /> -->
              </div>
            </div>
            <div class="field is-grouped is-justify-content-flex-end">
              <div class="control">
                <button class="button is-primary" type="submit">Upload</button>
              </div>
              <div class="control">
                <button class="button is-red" @click="$router.push('/demo/reviews')">Cancel</button>
              </div>
            </div>
          </form>
        </a-col>
      </a-row>
    </a-card>
    <!-- </a-spin> -->
  </div>
</template>
<script>
import { defineComponent, ref, onMounted } from 'vue'
const { VITE_API_KEY, VITE_APP_NAME, VITE_API_URL } = import.meta.env
import { message } from 'ant-design-vue'
import { PercentageOutlined, UploadOutlined } from '@ant-design/icons-vue'
import * as http from '/http.js'
import Swal from 'sweetalert2'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'

export default defineComponent({
  components: {
    UploadOutlined
  },
  setup() {
    const router = useRouter()
    const route = useRoute()
    let spinning = ref(false)
    let progressPercentage = ref(0)
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
      fileValue = ref()
      let file = event.target.files[0]
      if (file) {
        fileTitle.value = file.name
        fileValue.value = file
      }
    }
    let uploadCancelTokenSource = axios.CancelToken.source()
    let progressInterval = null
    let i = 0
    const onSubmit = async () => {
      openNav()
      let counter = 0
      changeSpinning()
      try {
        let formData = new FormData()
        formData.append('file1', fileValue.value)
        axios
          .post(`${VITE_API_URL}/api/app-template/fileRouter/saveFile`, formData, {
            cancelToken: uploadCancelTokenSource.token,
            onUploadProgress: (progressEvent) => {
              // console.log('progressEvent', progressEvent)
              // let percentComplete = progressEvent.loaded / progressEvent.total
              // percentComplete = parseInt(percentComplete * 100)
              // console.log(percentComplete)

              let i = 0
              progressInterval = setInterval(function () {
                if (i == 100 || progressPercentage.value >= 100 || progressPercentage.value == 'error') {
                  clearInterval(this)
                } else {
                  // console.log('Currently at ' + i++)
                  progressPercentage.value = i++
                }
              }, 1000)
            }
          })
          .then((response) => {
            setTimeout(() => {
              // console.log('data', response.data)
              if (response.data.length > 1) {
                // console.log('response.data', response.data)
                exportToCsv('output.csv', response.data)
                progressPercentage.value = 100
                // changeSpinning()
                Swal.fire({
                  icon: 'success',
                  title: 'Success!',
                  text: 'Generated responses successfully.'
                }).then((result) => {
                  closeNav()
                })
              } else {
                // changeSpinning()
                if (!uploadCancelTokenSource.token.reason.message) {
                  progressPercentage.value = 'error'
                  Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'Something went wrong! Please refresh and try again.'
                  })
                }
              }
            }, 10000)
          })
      } catch (e) {
        if (e.status == 400) {
          console.log('error!')
        }
      }
    }

    const exportToCsv = (filename, rows) => {
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

    const downloadTemplate = () => {
      exportToCsv('template.csv', [
        ['respid', 'qn', 'rating', 'response'],
        ['1', 'C7. [Rose]Olay Luminous Niacinamide + Rose Complex Repairs 98% of skin damage in 24 hours to give you a healthy rosy glow', '5', 'It deals with dull skin and gives rosy and healthy skin']
      ])
    }

    const openNav = () => {
      document.getElementById('myNav').style.display = 'block'
    }

    const closeNav = () => {
      document.getElementById('myNav').style.display = 'none'
      router.push('/demo/reviews')
      uploadCancelTokenSource.cancel('Operation canceled by the user')
      uploadCancelTokenSource = axios.CancelToken.source()

      fileTitle.value = ''
      progressPercentage.value = 0
      clearInterval(progressInterval)
    }

    return {
      openNav,
      closeNav,
      downloadTemplate,

      exportToCsv,
      fileValue,
      fileTitle,

      spinning,

      fileList,

      uploadedFile,

      uploadFile,
      uploadDoc,
      onSubmit,
      delayTime,

      progressPercentage
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

#myProgress {
  width: 100%;
  background-color: #ddd;
}

#myBar {
  width: 10%;
  height: 30px;
  background-color: #04aa6d;
  text-align: center;
  line-height: 30px;
  color: white;
}

.overlay {
  height: 100%;
  width: 100%;
  display: none;
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  background-color: rgb(0, 0, 0);
  background-color: rgba(0, 0, 0, 0.9);
}

.overlay-content {
  position: relative;
  top: 25%;
  width: 100%;
  text-align: center;
  margin-top: 30px;
}

.overlay a {
  padding: 8px;
  text-decoration: none;
  font-size: 36px;
  color: #818181;
  display: block;
  transition: 0.3s;
}

.overlay a:hover,
.overlay a:focus {
  color: #f1f1f1;
}

.overlay .closebtn {
  position: absolute;
  top: 20px;
  right: 45px;
  font-size: 60px;
}

.ant-progress-text {
  color: white;
}

@media screen and (max-height: 450px) {
  .overlay a {
    font-size: 20px;
  }
  .overlay .closebtn {
    font-size: 40px;
    top: 15px;
    right: 35px;
  }
}
</style>
