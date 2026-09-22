// Jenkins job type: "Pipeline" (or "Multibranch Pipeline" filtered to develop),
// "Pipeline script from SCM" pointing at this repo, with:
//   Additional Behaviours -> Custom workspace -> /home/ubuntu/oan_grievance_ui
// so Jenkins' own checkout IS the live deploy directory that
// oan-grievance-ui.service runs from -- no separate git pull needed.
pipeline {
    agent { label 'oan-grievance-box-a' }

    options {
        disableConcurrentBuilds()
        timestamps()
    }

    triggers {
        githubPush()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install deps') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Restart service') {
            steps {
                sh 'sudo systemctl restart oan-grievance-ui.service'
                sh 'sleep 3'
                sh 'sudo systemctl is-active oan-grievance-ui.service'
            }
        }

        stage('Smoke test') {
            steps {
               
                sh 'curl -fsSI http://127.0.0.1:3003/'
            }
        }
    }

    post {
        success {
            echo "oan_grievance_ui deployed: ${env.GIT_COMMIT ?: 'unknown commit'}"
        }
        failure {
            echo 'Build/deploy failed, check Jenkins logs for details.'
        }
    }
}