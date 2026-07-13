import { createRouter, createWebHistory } from 'vue-router'
import Home from '../pages/Home.vue'
import IssueDiploma from '../pages/IssueDiploma.vue'
import VerifyDiploma from '../pages/VerifyDiploma.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/issue',
      name: 'issue',
      component: IssueDiploma
    },
    {
      path: '/verify',
      name: 'verify',
      component: VerifyDiploma
    }
  ],
  scrollBehavior() {
    return { top: 0 }
  }
})

export default router
